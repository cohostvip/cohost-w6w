import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, channelPath, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { resourceId } from "../lib/resource-id.ts";

interface Input {
  channelId: string;
  event: string;
}

/**
 * DELETE /company/sales-channels/{channelId}/events/{event} — take an event off one of your
 * channels. Its application goes back to pending (re-accept it later with its tags and meta
 * intact). Fails when the event is not listed on the channel. Reports `{ removed: true }`.
 */
const removeChannelEvent: ActionDefinition<Input> = {
  key: "remove-channel-event",
  type: "perform",
  resource: "channel",
  title: "Remove Channel Event",
  description: "Take an event off one of your sales channels.",
  idempotent: false,
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
  ],
  output: [
    { key: "removed", type: "boolean", label: "Removed" },
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
  ],

  resolveFields: resolveChannelFields,

  async execute(input, ctx) {
    const eventId = resourceId(input.event, "events");
    ctx.log("info", "removing event from channel", { channelId: input.channelId, eventId });
    await new CohostClient(ctx).request(channelPath(input.channelId, "events", eventId), { method: "DELETE" });
    return { removed: true, eventId, channelId: input.channelId.trim() };
  },
};

export default removeChannelEvent;
