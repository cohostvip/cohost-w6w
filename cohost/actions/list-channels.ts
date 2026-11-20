import type { ActionDefinition } from "@w6w/types";
import { CHANNEL_TYPE_OPTIONS } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { CHANNEL_OUTPUT } from "../lib/outputs.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

interface Input {
  type?: string;
}

const OUTPUT: OutputField[] = [{ key: "results", type: "array", label: "Channels", items: CHANNEL_OUTPUT }];

/** GET /company/sales-channels — the sales channels your company owns, wrapped as `{ results }`. */
const listChannels: ActionDefinition<Input> = {
  key: "list-channels",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "List the sales channels your company owns.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: CHANNEL_TYPE_OPTIONS,
      hint: "Optional. Only channels of this type.",
    },
  ],
  output: OUTPUT,

  async execute(input, ctx) {
    ctx.log("info", "listing channels", { type: input.type });
    const results = await new CohostClient(ctx).request<unknown[]>("/company/sales-channels", {
      query: { type: input.type },
    });
    return { results };
  },
};

export default listChannels;
