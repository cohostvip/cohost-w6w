import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { contextParam } from "../lib/params.ts";

interface Input {
  event: string;
  /** One ticket object, or an array of them. */
  tickets: Record<string, unknown> | Record<string, unknown>[];
  context?: Record<string, unknown>;
}

/**
 * POST /events/{event}/tickets — create one or many ticket types.
 *
 * The wire body differs by arity: a single object is sent as `{ ticket }`, an
 * array as `{ tickets }` — matching `@cohostvip/cohost-node`'s `createTickets`.
 */
const createEventTickets: ActionDefinition<Input> = {
  key: "create-event-tickets",
  type: "perform",
  resource: "ticket",
  title: "Create Event Tickets",
  description: "Create one or more ticket types on a Cohost event.",
  idempotent: false,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "tickets",
      label: "Ticket(s)",
      type: "json",
      required: true,
      hint: 'One ticket object or an array, e.g. [{ "name": "VIP", "capacity": 20 }].',
    },
    contextParam,
  ],
  output: [{ key: "ids", type: "object", label: "Created Ticket IDs (by reference)" }],

  async execute(input, ctx) {
    const many = Array.isArray(input.tickets);
    ctx.log("info", "creating event tickets", { event: input.event, many });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}/tickets`, {
      method: "POST",
      body: many
        ? { tickets: input.tickets, context: input.context }
        : { ticket: input.tickets, context: input.context },
    });
  },
};

export default createEventTickets;
