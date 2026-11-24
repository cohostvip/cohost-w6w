import { fetchChannelEvent, isCohostNotFound } from "../lib/channel-event.ts";
import { channelIdParam, channelPath, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import {
  pickValues,
  pingOf,
  type SubscriptionState,
  type WebhookAggregated,
  subscribeWebhook,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { CHANNEL_CHANGED_OUTPUT, CHANNEL_CHANGED_SAMPLE } from "../lib/outputs.ts";
import { type TriggerMeta, type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";
import { parseListingPath } from "./channel-event-changed.ts";

const ACTIONS = ["event.change", "ticket.change"] as const;

interface Params {
  channelId?: string;
  actions?: string[];
  aggregateBy?: string;
  aggregateSeconds?: number | string;
}

const DEFAULT_AGGREGATE_SECONDS = 60;

/** `aggregateSeconds` as an integer 1-3600 (default 60); throws a clear error otherwise. */
function aggregateWindow(value: unknown): number {
  if (value === undefined || value === null || value === "") return DEFAULT_AGGREGATE_SECONDS;
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 3600) {
    throw new Error(`aggregateSeconds: must be a whole number of seconds from 1 to 3600, got ${JSON.stringify(value)}`);
  }
  return n;
}

/** `urn:1:<company>:<service>:<resourcePath>` → the resource path; `null` when it is not a URN. */
function resourcePathOfUrn(urn: unknown): string | null {
  if (typeof urn !== "string") return null;
  const parts = urn.split(":");
  if (parts[0] !== "urn" || parts.length < 5) return null;
  return parts.slice(4).join(":");
}

/** `meta.aggregated` for a folded ping; `undefined` for a plain one. */
function aggregatedMeta(agg: WebhookAggregated | undefined) {
  if (!agg) return undefined;
  return { count: agg.count, firstAt: agg.firstAt, lastAt: agg.lastAt, urns: agg.urns };
}

/** The unified payload; `action` is the general verb, `meta.change` the fine one. */
export type ChannelChangedPayload = TriggerPayload & {
  meta: TriggerMeta & {
    channelId: string;
    change: string;
    ticketId?: string;
    listingId?: string;
    properties?: Record<string, string | number | boolean>;
    /** Only when the subscription groups changes: what this one delivery folds. */
    aggregated?: { count: number; firstAt: string; lastAt: string; urns: string[] };
  };
};

/** `/events/{eventId}/tickets/{ticketId}` → the event id; `null` otherwise. */
function eventIdOf(resourcePath: string): string | null {
  const [events, eventId] = resourcePath.split("/").filter(Boolean);
  if (events !== "events" || !eventId) return null;
  try {
    return decodeURIComponent(eventId);
  } catch {
    return null;
  }
}

/**
 * Channel Changed — ONE subscription for changes to a sales channel's objects. `event.change`:
 * an event is listed on / changed on / unlisted from the channel (`channelEvent.*`).
 * `ticket.change`: a ticket created/updated/deleted on an event that is listed on the channel
 * (`offering.*`, checked against the channel's listings of that event; other events' tickets are
 * dropped, and a lookup failure other than a 404 throws — fail closed).
 */
const channelChanged: TriggerDefinition<Params, ChannelChangedPayload, SubscriptionState> = {
  key: "channel-changed",
  title: "Channel Changed",
  description:
    "Fires when something changes on one of your sales channels: an event is listed, changed or unlisted (event.change), or a ticket of a listed event changes (ticket.change). Optionally group a burst of changes (e.g. a bulk ticket update) into one run per event.",
  params: [
    channelIdParam({ required: true, hint: "Only changes on this channel." }),
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...ACTIONS],
      options: [
        { value: "event.change", label: "Event change" },
        { value: "ticket.change", label: "Ticket change" },
      ],
    },
    {
      key: "aggregateBy",
      label: "Grouping",
      type: "select",
      default: "none",
      hint: "Group changes to cut a burst (a bulk update) down to one run per event.",
      options: [
        { value: "none", label: "Send every change" },
        { value: "event", label: "Group changes per event" },
      ],
    },
    {
      key: "aggregateSeconds",
      label: "Grouping window (seconds)",
      type: "number",
      default: DEFAULT_AGGREGATE_SECONDS,
      hint: "Applies only when grouping per event: wait this long after the first change, then send one run. 1-3600.",
      validation: { integer: true, min: 1, max: 3600 },
    },
  ],
  output: CHANNEL_CHANGED_OUTPUT,
  sample: CHANNEL_CHANGED_SAMPLE,

  resolveFields: resolveChannelFields,

  async onSubscribe({ params, callbackUrl }, ctx) {
    if (typeof params.channelId !== "string" || !params.channelId.trim()) {
      throw new Error("channelId: required — pick the sales channel to watch");
    }
    const picked = pickValues("actions", params.actions, ACTIONS, ACTIONS);
    const events = [
      ...(picked.includes("event.change") ? ["listed", "changed", "unlisted"].map((a) => `channelEvent.${a}`) : []),
      ...(picked.includes("ticket.change") ? ["created", "updated", "deleted"].map((a) => `offering.${a}`) : []),
    ];
    const aggregate = params.aggregateBy === "event"
      ? { by: "event" as const, windowSeconds: aggregateWindow(params.aggregateSeconds) }
      : undefined;
    return subscribeWebhook(ctx, "w6w: channel changed", callbackUrl, events, aggregate);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw, params }, ctx) {
    const channelId = typeof params.channelId === "string" ? params.channelId.trim() : "";
    if (!channelId) throw new Error("channelId: required");
    const ping = pingOf(raw);
    const change = ping.action.slice(ping.action.indexOf(".") + 1);

    if (ping.action.startsWith("channelEvent.")) {
      const aggregated = aggregatedMeta(ping.data?.aggregated);
      // The latest ping's listing first, then every other folded one — on this channel, once each.
      const seen = new Set<string>();
      const listings: Array<{ listing: NonNullable<ReturnType<typeof parseListingPath>>; urn: string; resourcePath: string; latest: boolean }> = [];
      const add = (urn: string, resourcePath: string | null, latest: boolean) => {
        const listing = resourcePath ? parseListingPath(resourcePath) : null;
        if (!listing || !resourcePath || listing.channelId !== channelId) return;
        const key = `${listing.eventId}/${listing.listingId}`;
        if (seen.has(key)) return;
        seen.add(key);
        listings.push({ listing, urn, resourcePath, latest });
      };
      add(ping.urn, ping.context.resourcePath, true);
      for (const urn of ping.data?.aggregated?.urns ?? []) add(urn, resourcePathOfUrn(urn), false);

      const out: ChannelChangedPayload[] = [];
      for (const { listing, urn, resourcePath, latest } of listings) {
        let data: unknown = null;
        if (!latest || ping.action !== "channelEvent.unlisted") {
          try {
            data = await fetchChannelEvent(ctx, listing);
          } catch (error) {
            if (!isCohostNotFound(error)) throw error;
          }
        }
        out.push({
          urn,
          action: "event.change",
          type: "channelEvent",
          id: listing.eventId,
          timestamp: ping.timestamp,
          data: data ?? null,
          meta: {
            changedFields: ping.data?.changedFields ?? [],
            companyId: ping.context.companyId,
            eventId: listing.eventId,
            resourcePath,
            deliveryId: ping.id,
            channelId,
            change: latest ? change : "changed",
            listingId: listing.listingId,
            properties: latest ? ping.data?.properties ?? {} : {},
            ...(aggregated ? { aggregated } : {}),
          },
        });
      }
      return out;
    }

    if (ping.action.startsWith("offering.")) {
      const eventId = eventIdOf(ping.context.resourcePath);
      if (!eventId) return [];
      let listed: boolean;
      try {
        const rows = await new CohostClient(ctx).request<unknown>(channelPath(channelId, "events", eventId, "listings"));
        listed = Array.isArray(rows) && rows.length > 0;
      } catch (error) {
        if (!isCohostNotFound(error)) throw error;
        listed = false;
      }
      if (!listed) return [];
      const payload = await toPayload(raw, ctx);
      return [{
        ...payload,
        action: "ticket.change",
        meta: {
          ...payload.meta,
          channelId,
          eventId,
          change,
          ticketId: payload.id,
          ...(ping.data?.aggregated ? { aggregated: aggregatedMeta(ping.data.aggregated) } : {}),
        },
      }];
    }
    return [];
  },
};

export default channelChanged;
