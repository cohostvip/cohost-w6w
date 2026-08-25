import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { contextParam, ticketOutput } from "../lib/params.ts";

interface Input {
  event: string;
  ticket: string;
  /** Partial ticket fields. Wrapped as `{ ticket }` on the wire. */
  patch: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/** PATCH /events/{event}/tickets/{ticket} — partial update of a ticket type. */
const updateEventTicket: ActionDefinition<Input> = {
  key: "update-event-ticket",
  type: "perform",
  resource: "ticket",
  title: "Update Event Ticket",
  description: "Partially update a ticket type on a Cohost event.",
  idempotent: true,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "ticket", label: "Ticket ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Partial ticket fields, e.g. { "capacity": 120 }.',
    },
    contextParam,
  ],
  output: ticketOutput,

  async execute(input, ctx) {
    ctx.log("info", "updating event ticket", { event: input.event, ticket: input.ticket });
    const client = new CohostClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.event)}/tickets/${encodeURIComponent(input.ticket)}`,
      { method: "PATCH", body: { ticket: input.patch, context: input.context } },
    );
  },
};

export default updateEventTicket;
