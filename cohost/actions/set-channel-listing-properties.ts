import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  eventId: string;
  listingId?: string;
  /** `{ key: value }` — a value sets the property, `null` clears it, keys left out keep theirs. */
  properties: Record<string, unknown>;
}

/**
 * PATCH /company/sales-channels/{channelId}/events/{eventId}/listings/{listingId}/properties —
 * set the values your channel keeps on one listing of an event: the properties the channel
 * declares in its settings (e.g. "Eventbrite event ID"). The write-back step of a workflow that
 * publishes a channel's listings elsewhere: the next `channel-event-changed` for the listing
 * carries them in `meta.properties`. This write does not fire `channel-event-changed`.
 */
const setChannelListingProperties: ActionDefinition<Input> = {
  key: "set-channel-listing-properties",
  type: "perform",
  resource: "channel",
  title: "Set Channel Listing Properties",
  description:
    "Set the values your sales channel keeps on an event's listing — e.g. the id an integration published it under.",
  idempotent: true,
  params: [
    channelIdParam({ required: true }),
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      required: true,
      hint: 'Keys your channel declares, e.g. { "eventbriteId": "1234567890" }. null clears one.',
    },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed).",
    },
  ],
  output: [
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "listingId", type: "string", label: "Listing ID" },
    { key: "slug", type: "string", label: "Listing slug" },
    { key: "properties", type: "object", label: "The listing's properties after the write" },
  ],

  resolveFields: resolveChannelFields,

  async execute(input, ctx) {
    const listingId = input.listingId?.trim() || "primary";
    if (!input.properties || typeof input.properties !== "object" || Array.isArray(input.properties)) {
      throw new Error('Properties must be an object, e.g. { "eventbriteId": "1234567890" }');
    }
    ctx.log("info", "setting channel listing properties", {
      channelId: input.channelId,
      eventId: input.eventId,
      listingId,
    });
    return new CohostClient(ctx).request(
      `/company/sales-channels/${encodeURIComponent(input.channelId)}/events/${
        encodeURIComponent(input.eventId)
      }/listings/${encodeURIComponent(listingId)}/properties`,
      { method: "PATCH", body: { properties: input.properties } },
    );
  },
};

export default setChannelListingProperties;
