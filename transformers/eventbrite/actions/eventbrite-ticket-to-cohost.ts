import type { ActionDefinition } from "@w6w/types";
import { eventbriteTicketToCohost } from "../lib/tickets.ts";
import type { EbTicketClass } from "../lib/types.ts";

interface Input {
  /** An Eventbrite Ticket Class object. */
  ticketClass: EbTicketClass;
  /** Currency to assume when the ticket class carries no `cost` (e.g. free). Defaults to USD. */
  currency?: string;
}

/**
 * Transform an Eventbrite Ticket Class into a Cohost ticket (admission offering).
 *
 * Pure shape conversion — no auth, no network.
 */
const eventbriteTicketToCohostAction: ActionDefinition<Input> = {
  key: "eventbrite-ticket-to-cohost",
  type: "perform",
  resource: "ticket",
  title: "Eventbrite → Cohost: Ticket",
  description: "Convert an Eventbrite ticket class into a Cohost ticket object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "ticketClass", label: "Eventbrite Ticket Class (JSON)", type: "json", required: true },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for free tickets. Defaults to USD." },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "type", type: "string", label: "Type" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "price", type: "string", label: "Price (USD,1000)" },
    { key: "quantity", type: "number", label: "Quantity" },
    { key: "status", type: "string", label: "Status" },
    { key: "priceCategory", type: "string", label: "Price Category" },
    { key: "source", type: "string", label: "Source" },
    { key: "sourceId", type: "string", label: "Source ID" },
  ],

  execute(input) {
    return eventbriteTicketToCohost(input.ticketClass, input.currency ?? "USD");
  },
};

export default eventbriteTicketToCohostAction;
