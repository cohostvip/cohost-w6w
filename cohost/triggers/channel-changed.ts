import { fetchChannelEvent, isCohostNotFound } from "../lib/channel-event.ts";
import { channelIdParam, channelPath, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import {
  pickValues,
  pingOf,
  type SubscriptionState,
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
}

/** The unified payload; `action` is the general verb, `meta.change` the fine one. */
export type ChannelChangedPayload = TriggerPayload & {
  meta: TriggerMeta & {
    channelId: string;
    change: string;
    ticketId?: string;
    listingId?: string;
    properties?: Record<string, string | number | boolean>;
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
    "Fires when something changes on one of your sales channels: an event is listed, changed or unlisted (event.change), or a ticket of a listed event changes (ticket.change).",
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
    return subscribeWebhook(ctx, "w6w: channel changed", callbackUrl, events);
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
      const listing = parseListingPath(ping.context.resourcePath);
      if (!listing || listing.channelId !== channelId) return [];
      let data: unknown = null;
      if (ping.action !== "channelEvent.unlisted") {
        try {
          data = await fetchChannelEvent(ctx, listing);
        } catch (error) {
          if (!isCohostNotFound(error)) throw error;
        }
      }
      return [{
        urn: ping.urn,
        action: "event.change",
        type: "channelEvent",
        id: listing.eventId,
        timestamp: ping.timestamp,
        data: data ?? null,
        meta: {
          changedFields: ping.data?.changedFields ?? [],
          companyId: ping.context.companyId,
          eventId: listing.eventId,
          resourcePath: ping.context.resourcePath,
          deliveryId: ping.id,
          channelId,
          change,
          listingId: listing.listingId,
          properties: ping.data?.properties ?? {},
        },
      }];
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
        meta: { ...payload.meta, channelId, eventId, change, ticketId: payload.id },
      }];
    }
    return [];
  },
};

export default channelChanged;
