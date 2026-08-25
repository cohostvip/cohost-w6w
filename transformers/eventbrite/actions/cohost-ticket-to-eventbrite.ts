import type { ActionDefinition } from "@w6w/types";
import { cohostTicketToEventbrite } from "../lib/tickets.ts";
import type { CohostTicket } from "../lib/types.ts";

interface Input {
  /** A Cohost ticket object. */
  ticket: CohostTicket;
}

/**
 * Transform a Cohost ticket into an Eventbrite Ticket Class.
 *
 * Pure shape conversion — no auth, no network. The output matches the body
 * Eventbrite's `POST /events/{id}/ticket_classes` expects (nested under
 * `ticket_class`).
 */
const cohostTicketToEventbriteAction: ActionDefinition<Input> = {
  key: "cohost-ticket-to-eventbrite",
  type: "perform",
  resource: "ticket",
  title: "Cohost → Eventbrite: Ticket",
  description: "Convert a Cohost ticket into an Eventbrite ticket class object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "ticket", label: "Cohost Ticket (JSON)", type: "json", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "free", type: "boolean", label: "Free" },
    { key: "cost", type: "object", label: "Cost" },
    { key: "quantity_total", type: "number", label: "Quantity Total" },
    { key: "quantity_sold", type: "number", label: "Quantity Sold" },
    { key: "hidden", type: "boolean", label: "Hidden" },
  ],

  execute(input) {
    return cohostTicketToEventbrite(input.ticket);
  },
};

export default cohostTicketToEventbriteAction;
