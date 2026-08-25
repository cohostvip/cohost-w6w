import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import type { Ticket } from "../lib/types.ts";

interface Input {
  event: string;
}

/**
 * GET /events/{event}/tickets — all ticket types on an event.
 *
 * The API answers with a bare array; it is wrapped as `{ results }` so the
 * output is addressable like every other list action in this app.
 */
const listEventTickets: ActionDefinition<Input> = {
  key: "list-event-tickets",
  type: "read",
  resource: "ticket",
  title: "List Event Tickets",
  description: "List the ticket types on a Cohost event.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
  ],
  output: [{ key: "results", type: "array", label: "Tickets" }],

  async execute(input, ctx) {
    ctx.log("info", "listing event tickets", { event: input.event });
    const client = new CohostClient(ctx);
    const results = await client.request<Ticket[]>(
      `/events/${encodeURIComponent(input.event)}/tickets`,
    );
    return { results };
  },
};

export default listEventTickets;
