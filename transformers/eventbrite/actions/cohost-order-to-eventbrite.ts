import type { ActionDefinition } from "@w6w/types";
import { cohostOrderToEventbrite } from "../lib/orders.ts";
import type { CohostOrder } from "../lib/types.ts";

interface Input {
  /** A Cohost Order object. */
  order: CohostOrder;
}

/**
 * Transform a Cohost Order into an Eventbrite Order.
 *
 * Pure shape conversion — no auth, no network. Cohost's single `fee` is written
 * back onto `eventbrite_fee` (payment_fee → 0), and `gross`/costs are recomposed
 * into Eventbrite's cost object.
 */
const cohostOrderToEventbriteAction: ActionDefinition<Input> = {
  key: "cohost-order-to-eventbrite",
  type: "perform",
  resource: "order",
  title: "Cohost → Eventbrite: Order",
  description: "Convert a Cohost order into an Eventbrite order object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "order", label: "Cohost Order (JSON)", type: "json", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "costs", type: "object", label: "Costs" },
    { key: "attendees", type: "array", label: "Attendees" },
  ],

  execute(input) {
    return cohostOrderToEventbrite(input.order);
  },
};

export default cohostOrderToEventbriteAction;
