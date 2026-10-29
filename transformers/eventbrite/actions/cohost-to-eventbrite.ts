import type { ActionDefinition } from "@w6w/types";
import { cohostToEventbrite } from "../lib/resolve-cohost.ts";
import type { CohostToEventbriteResult } from "../lib/resolve-cohost.ts";

interface Input {
  data: unknown;
  currency?: string;
}

const cohostToEventbriteAction: ActionDefinition<Input, CohostToEventbriteResult> = {
  key: "cohost-to-eventbrite",
  type: "perform",
  resource: "transform",
  title: "Cohost → Eventbrite",
  description: "Detect and convert Cohost events, tickets, orders, arrays, and listings, including expanded tickets and order items.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Cohost Data (JSON)", type: "json", required: true },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for events and orders without a currency. Ticket prices carry their own currency. Defaults to USD." },
  ],

  execute(input) {
    return cohostToEventbrite(input.data, input.currency ?? "USD");
  },
};

export default cohostToEventbriteAction;
