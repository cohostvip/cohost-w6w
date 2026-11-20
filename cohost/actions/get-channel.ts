import type { ActionDefinition } from "@w6w/types";
import { channelPath } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { CHANNEL_OUTPUT } from "../lib/outputs.ts";

interface Input {
  channelId: string;
}

/** GET /company/sales-channels/{channelId} — one of your company's sales channels. */
const getChannel: ActionDefinition<Input> = {
  key: "get-channel",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Fetch one of your sales channels by id.",
  params: [{ key: "channelId", label: "Channel ID", type: "string", required: true }],
  output: CHANNEL_OUTPUT,

  async execute(input, ctx) {
    ctx.log("info", "fetching channel", { channelId: input.channelId });
    return new CohostClient(ctx).request(channelPath(input.channelId));
  },
};

export default getChannel;
