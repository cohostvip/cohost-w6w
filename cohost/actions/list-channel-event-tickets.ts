import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, resolveChannelFields } from "../lib/channels.ts";
import {
  type ChannelListingRef,
  fetchChannelEventTickets,
  isCohostNotFound,
  notShownOnChannel,
} from "../lib/channel-event.ts";
import { CHANNEL_TICKET_OUTPUT } from "../lib/outputs.ts";
import { resourceId } from "../lib/resource-id.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

const OUTPUT: OutputField[] = [
  { key: "results", type: "array", label: "Tickets on the channel", items: CHANNEL_TICKET_OUTPUT },
];

interface Input {
  channelId: string;
  /** Event id, slug or URN. */
  event: string;
  listingId?: string;
}

/**
 * GET /events/{event}/tickets with the `x-cohost-channel-id` header — the tickets your sales
 * channel sells for one listing of an event, at the channel's prices (markup or flat price,
 * plus the channel's fees); each reads `unavailable` while the organizer has paused sales on the
 * channel. Live and sold-out tickets only, without the owner's stock figures. Wrapped as
 * `{ results }` like every list action. Fails when the channel does not show the listing.
 */
const listChannelEventTickets: ActionDefinition<Input> = {
  key: "list-channel-event-tickets",
  type: "read",
  resource: "channel",
  title: "List Channel Event Tickets",
  description: "List the tickets your sales channel sells for an event, at the channel's prices.",
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID, slug or URN)", type: "string", required: true },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed).",
    },
  ],
  output: OUTPUT,

  resolveFields: resolveChannelFields,

  async execute(input, ctx) {
    const ref: ChannelListingRef = {
      channelId: input.channelId.trim(),
      eventId: resourceId(input.event, "events"),
      listingId: input.listingId,
    };
    ctx.log("info", "listing channel event tickets", { ...ref });
    try {
      return { results: await fetchChannelEventTickets(ctx, ref) };
    } catch (error) {
      if (isCohostNotFound(error)) throw notShownOnChannel(ref);
      throw error;
    }
  },
};

export default listChannelEventTickets;
