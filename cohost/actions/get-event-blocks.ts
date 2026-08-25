import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  event: string;
}

/**
 * GET /events/{event}/blocks — the event's content blocks, in display order.
 *
 * Blocks are composable content units (richtext, gallery, locations, FAQ, …).
 * The API's own `{ blocks }` envelope is preserved.
 */
const getEventBlocks: ActionDefinition<Input> = {
  key: "get-event-blocks",
  type: "read",
  resource: "event",
  title: "Get Event Content Blocks",
  description: "Fetch the content blocks of a Cohost event, in display order.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
  ],
  output: [{ key: "blocks", type: "array", label: "Content Blocks" }],

  async execute(input, ctx) {
    ctx.log("info", "fetching event blocks", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}/blocks`);
  },
};

export default getEventBlocks;
