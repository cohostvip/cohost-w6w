import type { ActionDefinition } from "@w6w/types";
import { channelPath } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

/**
 * DELETE /company/sales-channels/{channelId} — delete one of your sales channels. Needs an
 * admin, editor or owner role in the company. Reports `{ deleted: true }` to branch on.
 */
const deleteChannel: ActionDefinition<Input> = {
  key: "delete-channel",
  type: "perform",
  resource: "channel",
  title: "Delete Channel",
  description: "Delete one of your sales channels.",
  idempotent: true,
  params: [{ key: "channelId", label: "Channel ID", type: "string", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Channel ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting channel", { channelId: input.channelId });
    await new CohostClient(ctx).request(channelPath(input.channelId), { method: "DELETE" });
    return { deleted: true, id: input.channelId.trim() };
  },
};

export default deleteChannel;
