import type { HookContext } from "@w6w/types";
import { CohostClient } from "./client.ts";

/** One listing of an event on a sales channel. */
export interface ChannelListingRef {
  channelId: string;
  /** Event id or slug. */
  eventId: string;
  /** One of the event's listings on the channel; empty for the main (`primary`) one. */
  listingId?: string;
}

/**
 * GET /events/{eventId} with the `x-cohost-channel-id` header — the event exactly as the channel
 * shows that listing: the channel's name for it and its content blocks (the `description` block
 * carries the channel's description), not the organizer's own event. No `description`,
 * `ticketPrices` or `searchTags`: the listing's prices are on its tickets
 * ({@link fetchChannelEventTickets}). Cohost answers 404 when the channel does not show it: not
 * listed there, hidden, or not live.
 */
export function fetchChannelEvent<T = unknown>(ctx: HookContext, ref: ChannelListingRef): Promise<T> {
  return new CohostClient(ctx).request<T>(`/events/${encodeURIComponent(ref.eventId)}`, {
    query: { listingId: ref.listingId?.trim() },
    headers: { "x-cohost-channel-id": ref.channelId },
  });
}

/** Whether a {@link CohostClient} error is Cohost's 404. */
export function isCohostNotFound(error: unknown): boolean {
  return error instanceof Error && /^Cohost 404 /.test(error.message);
}

/**
 * GET /events/{eventId}/tickets with the `x-cohost-channel-id` header — the tickets the channel
 * sells for that listing, at its channel prices (markup or flat price, plus the channel's fees),
 * each `unavailable` while the organizer has paused sales on the channel. 404 as
 * {@link fetchChannelEvent}.
 */
export function fetchChannelEventTickets<T = unknown>(ctx: HookContext, ref: ChannelListingRef): Promise<T[]> {
  return new CohostClient(ctx).request<T[]>(`/events/${encodeURIComponent(ref.eventId)}/tickets`, {
    query: { listingId: ref.listingId?.trim() },
    headers: { "x-cohost-channel-id": ref.channelId },
  });
}

/** The error to show when the channel does not show the listing (Cohost's 404). */
export function notShownOnChannel(ref: ChannelListingRef): Error {
  const listing = ref.listingId?.trim() && ref.listingId.trim() !== "primary" ? ` (listing ${ref.listingId.trim()})` : "";
  return new Error(
    `Event ${ref.eventId}${listing} is not shown on channel ${ref.channelId}: not listed there, hidden, or not live`,
  );
}
