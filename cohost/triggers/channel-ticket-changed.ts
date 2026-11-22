import { isCohostNotFound } from "../lib/channel-event.ts";
import { channelIdParam, channelPath, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import {
  pickValues,
  pingOf,
  type SubscriptionState,
  subscribeWebhook,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { TICKET_CHANGED_OUTPUT, TICKET_CHANGED_SAMPLE } from "../lib/outputs.ts";
import { type TriggerMeta, type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

const ACTIONS = ["created", "updated", "deleted"] as const;

interface Params {
  channelId?: string;
  actions?: string[];
}

/** The ticket-changed payload, plus the channel the ticket's event is listed on. */
export type ChannelTicketPayload = TriggerPayload & {
  meta: TriggerMeta & { channelId: string; ticketId: string };
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
 * Channel Ticket Changed — {@link ticket-changed}, but only for tickets of events currently
 * listed on one sales channel. Subscribes to the same `offering.*` webhooks; each ping is
 * checked against `GET /company/sales-channels/{channelId}/events/{eventId}/listings` and
 * dropped (no run) when the event has no listing row there. Membership is cached per event for
 * one ingest call only; a lookup failure other than a 404 throws (fail closed).
 */
const channelTicketChanged: TriggerDefinition<Params, ChannelTicketPayload, SubscriptionState> = {
  key: "channel-ticket-changed",
  title: "Channel Ticket Changed",
  description:
    "Fires when a ticket changes on an event that is listed on the chosen sales channel; tickets of other events are ignored.",
  params: [
    channelIdParam({ required: true, hint: "Only tickets of events listed on this channel." }),
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...ACTIONS],
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" },
      ],
    },
  ],
  output: TICKET_CHANGED_OUTPUT,
  sample: TICKET_CHANGED_SAMPLE,

  resolveFields: resolveChannelFields,

  async onSubscribe({ params, callbackUrl }, ctx) {
    if (typeof params.channelId !== "string" || !params.channelId.trim()) {
      throw new Error("channelId: required — pick the sales channel whose events' tickets to watch");
    }
    const events = pickValues("actions", params.actions, ACTIONS, ACTIONS).map((a) => `offering.${a}`);
    return subscribeWebhook(ctx, "w6w: channel ticket changed", callbackUrl, events);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw, params }, ctx) {
    const channelId = typeof params.channelId === "string" ? params.channelId.trim() : "";
    if (!channelId) throw new Error("channelId: required");
    const ping = pingOf(raw);
    const eventId = eventIdOf(ping.context.resourcePath);
    if (!eventId) return [];

    // Per-call cache only: a fresh one every ingest.
    const members = new Map<string, boolean>();
    if (!members.has(eventId)) {
      try {
        const rows = await new CohostClient(ctx).request<unknown>(channelPath(channelId, "events", eventId, "listings"));
        members.set(eventId, Array.isArray(rows) && rows.length > 0);
      } catch (error) {
        if (!isCohostNotFound(error)) throw error;
        members.set(eventId, false);
      }
    }
    if (!members.get(eventId)) return [];

    const payload = await toPayload(raw, ctx);
    return [{ ...payload, meta: { ...payload.meta, channelId, eventId, ticketId: payload.id } }];
  },
};

export default channelTicketChanged;
