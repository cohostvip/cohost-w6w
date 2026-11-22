import { fetchChannelEvent, isCohostNotFound } from "../lib/channel-event.ts";
import { channelIdParam, resolveChannelFields } from "../lib/channels.ts";
import {
  pickValues,
  pingOf,
  type SubscriptionState,
  subscribeWebhook,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { CHANNEL_EVENT_CHANGED_OUTPUT, CHANNEL_EVENT_CHANGED_SAMPLE } from "../lib/outputs.ts";
import type { TriggerMeta, TriggerPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

const ACTIONS = ["listed", "changed", "unlisted"] as const;
const DEFAULT_ACTIONS = ["listed", "changed", "unlisted"] as const;

interface Params {
  channelId?: string;
  actions?: string[];
}

/** The unified payload, plus which listing of the event on which channel it is about. */
export type ChannelEventPayload = TriggerPayload & {
  meta: TriggerMeta & {
    channelId: string;
    listingId: string;
    /** The values the channel keeps on this listing — e.g. the id it was published under elsewhere. */
    properties: Record<string, string | number | boolean>;
  };
};

/** `/channels/{channelId}/events/{eventId}/listings/{listingId}` → its parts; `null` otherwise. */
export function parseListingPath(resourcePath: string): { channelId: string; eventId: string; listingId: string } | null {
  const [channels, channelId, events, eventId, listings, listingId, ...rest] = resourcePath.split("/").filter(Boolean);
  if (channels !== "channels" || events !== "events" || listings !== "listings" || rest.length > 0) return null;
  if (!channelId || !eventId || !listingId) return null;
  return {
    channelId: decodeURIComponent(channelId),
    eventId: decodeURIComponent(eventId),
    listingId: decodeURIComponent(listingId),
  };
}

/**
 * Channel Event Changed — fires when what a sales channel shows of an event changes: the event
 * is `listed` on the channel (accepted, attached, made live or shown again), its listing
 * `changed` (the event, any of its tickets — prices included — or the organizer's
 * customization for the channel), or it is `unlisted` (removed, hidden, cancelled or back to
 * draft). Made for republishing a channel's events elsewhere — a channel that mirrors to another
 * marketplace — so it fires for the channel OWNER's company, whoever owns the event.
 *
 * One delivery per LISTING: a channel that lists an event more than once (e.g. GA and VIP) gets
 * one per listing, told apart by `meta.listingId` (`primary` for the first).
 *
 * `data` is the listing exactly as the channel shows it — `GET /events/{eventId}?listingId=…`
 * with the channel header: its channel name, description and prices — fetched when the trigger
 * fires. `null` once unlisted, or when the channel stopped showing it before the fetch.
 *
 * `meta.properties` are the values the channel keeps on the listing (declared in the channel's
 * settings) — e.g. the Eventbrite id a previous run published it under, so this run updates that
 * event instead of creating another. A run writes them back with `set-channel-listing-properties`,
 * which does not fire this trigger again. On `unlisted` they are the values the listing had.
 */
const channelEventChanged: TriggerDefinition<Params, ChannelEventPayload, SubscriptionState> = {
  key: "channel-event-changed",
  title: "Channel Event Changed",
  description:
    "Fires when an event is listed on, changes on, or is unlisted from one of your sales channels.",
  params: [
    channelIdParam({ hint: "Only this channel's listings. Leave empty for all of your channels." }),
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...DEFAULT_ACTIONS],
      options: [
        { value: "listed", label: "Listed" },
        { value: "changed", label: "Changed" },
        { value: "unlisted", label: "Unlisted" },
      ],
    },
  ],
  output: CHANNEL_EVENT_CHANGED_OUTPUT,
  sample: CHANNEL_EVENT_CHANGED_SAMPLE,

  // The Channel picker. Declared the way an Action declares it; w6w runs it once it serves
  // trigger forms too (see `TriggerDefinition.resolveFields`).
  resolveFields: resolveChannelFields,

  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS, DEFAULT_ACTIONS).map((a) => `channelEvent.${a}`);
    return subscribeWebhook(ctx, "w6w: channel event changed", callbackUrl, events);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw, params }, ctx) {
    const ping = pingOf(raw);
    const listing = parseListingPath(ping.context.resourcePath);
    if (!listing) return [];
    const channelFilter = typeof params.channelId === "string" ? params.channelId.trim() : "";
    if (channelFilter && channelFilter !== listing.channelId) return [];

    let data: unknown = null;
    if (ping.action !== "channelEvent.unlisted") {
      try {
        data = await fetchChannelEvent(ctx, listing);
      } catch (error) {
        // The channel no longer shows it (hidden or removed since): nothing to publish.
        if (!isCohostNotFound(error)) throw error;
      }
    }

    return [{
      urn: ping.urn,
      action: ping.action,
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
        channelId: listing.channelId,
        listingId: listing.listingId,
        properties: ping.data?.properties ?? {},
      },
    }];
  },
};

export default channelEventChanged;
