import type { ActionDefinition } from "@w6w/types";
import { channelPath } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { resourceId } from "../lib/resource-id.ts";

interface Input {
  channelId: string;
  event: string;
  visibility: "visible" | "hidden";
}

/**
 * PATCH /company/sales-channels/{channelId}/events/{event}/listing — show or hide an event on one
 * of your channels. Hidden keeps it on the channel (and in List Channel Events) but out of what
 * the channel shows buyers; it fires Channel Event Changed as unlisted, and showing it again as
 * listed.
 */
const setChannelEventVisibility: ActionDefinition<Input> = {
  key: "set-channel-event-visibility",
  type: "perform",
  resource: "channel",
  title: "Show or Hide Channel Event",
  description: "Show or hide an event on one of your sales channels, without removing it.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      required: true,
      default: "hidden",
      options: [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
      ],
    },
  ],
  output: [
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "slug", type: "string", label: "Listing slug" },
    { key: "tags", type: "array", label: "Listing tags" },
    { key: "meta", type: "object", label: "Listing meta" },
  ],

  async execute(input, ctx) {
    const eventId = resourceId(input.event, "events");
    ctx.log("info", "setting channel event visibility", { channelId: input.channelId, eventId, visibility: input.visibility });
    return new CohostClient(ctx).request(channelPath(input.channelId, "events", eventId, "listing"), {
      method: "PATCH",
      body: { visibility: input.visibility },
    });
  },
};

export default setChannelEventVisibility;
