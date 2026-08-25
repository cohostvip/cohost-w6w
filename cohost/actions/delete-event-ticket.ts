import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  event: string;
  ticket: string;
}

/**
 * DELETE /events/{event}/tickets/{ticket} — remove a ticket type.
 *
 * Returns no content; the action reports `{ deleted: true }` so downstream steps
 * have something to branch on.
 */
const deleteEventTicket: ActionDefinition<Input> = {
  key: "delete-event-ticket",
  type: "perform",
  resource: "ticket",
  title: "Delete Event Ticket",
  description: "Delete a ticket type from a Cohost event.",
  idempotent: true,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "ticket", label: "Ticket ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Ticket ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting event ticket", { event: input.event, ticket: input.ticket });
    const client = new CohostClient(ctx);
    await client.request(
      `/events/${encodeURIComponent(input.event)}/tickets/${encodeURIComponent(input.ticket)}`,
      { method: "DELETE" },
    );
    return { deleted: true, id: input.ticket };
  },
};

export default deleteEventTicket;
