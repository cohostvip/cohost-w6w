import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, channelPath, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { CHANNEL_LISTING_OUTPUT } from "../lib/outputs.ts";
import { resourceId } from "../lib/resource-id.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

interface Input {
  channelId: string;
  event: string;
}

const OUTPUT: OutputField[] = [{ key: "results", type: "array", label: "Listings", items: CHANNEL_LISTING_OUTPUT }];

/**
 * GET /company/sales-channels/{channelId}/events/{event}/listings — every listing of an event on
 * one of your channels (the primary one, then any extra ones the organizer added), each with the
 * property values your channel keeps on it. Wrapped as `{ results }`.
 */
const listChannelEventListings: ActionDefinition<Input> = {
  key: "list-channel-event-listings",
  type: "read",
  resource: "channel",
  title: "List Channel Event Listings",
  description: "List an event's listings on one of your sales channels, with the properties your channel keeps on each.",
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
  ],
  output: OUTPUT,

  resolveFields: resolveChannelFields,

  async execute(input, ctx) {
    const eventId = resourceId(input.event, "events");
    ctx.log("info", "listing channel event listings", { channelId: input.channelId, eventId });
    const results = await new CohostClient(ctx).request<unknown[]>(
      channelPath(input.channelId, "events", eventId, "listings"),
    );
    return { results };
  },
};

export default listChannelEventListings;
