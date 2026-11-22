import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, resolveChannelFields } from "../lib/channels.ts";
import {
  type ChannelListingRef,
  fetchChannelEvent,
  fetchChannelEventTickets,
  isCohostNotFound,
  notShownOnChannel,
} from "../lib/channel-event.ts";
import { CHANNEL_EVENT_OUTPUT, CHANNEL_TICKET_OUTPUT } from "../lib/outputs.ts";
import { resourceId } from "../lib/resource-id.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

const OUTPUT: OutputField[] = [
  ...CHANNEL_EVENT_OUTPUT,
  { key: "tickets", type: "array", label: "Tickets on the channel", items: CHANNEL_TICKET_OUTPUT },
];

interface Input {
  channelId: string;
  /** Event id, slug or URN. */
  event: string;
  listingId?: string;
}

/**
 * GET /events/{event} + GET /events/{event}/tickets, both with the `x-cohost-channel-id` header —
 * one listing of an event exactly as your sales channel shows it: the channel's name for it, its
 * content blocks (the `description` block carries the channel's description), whether ticket
 * sales are on there (`salesEnabled`), and its `tickets` at
 * the channel's prices (markup or flat price, plus the channel's fees). What a workflow that
 * mirrors a channel's events elsewhere publishes; Channel Event Changed hands the same event
 * (without `tickets`) as its `data`. Fails when the channel does not show the listing.
 */
const getChannelEvent: ActionDefinition<Input> = {
  key: "get-channel-event",
  type: "read",
  resource: "channel",
  title: "Get Channel Event",
  description:
    "Fetch an event as your sales channel shows it — its channel name, content blocks (with the description), whether sales are on, and its tickets at channel prices.",
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
    ctx.log("info", "fetching channel event", { ...ref });
    try {
      const [event, tickets] = await Promise.all([
        fetchChannelEvent<Record<string, unknown>>(ctx, ref),
        fetchChannelEventTickets(ctx, ref),
      ]);
      return { ...event, tickets };
    } catch (error) {
      if (isCohostNotFound(error)) throw notShownOnChannel(ref);
      throw error;
    }
  },
};

export default getChannelEvent;
