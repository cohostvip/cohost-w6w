import type { ActionDefinition } from "@w6w/types";
import { eventbriteOrderToCohost } from "../lib/orders.ts";
import type { EbOrder } from "../lib/types.ts";

interface Input {
  /** An Eventbrite Order object (ideally expanded with `attendees`). */
  order: EbOrder;
}

/**
 * Transform an Eventbrite Order into a Cohost Order.
 *
 * Pure shape conversion — no auth, no network. Expand the Eventbrite order with
 * `attendees` (`?expand=attendees`) so line items and per-item costs come across.
 */
const eventbriteOrderToCohostAction: ActionDefinition<Input> = {
  key: "eventbrite-order-to-cohost",
  type: "perform",
  resource: "order",
  title: "Eventbrite → Cohost: Order",
  description: "Convert an Eventbrite order into a Cohost order object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "order", label: "Eventbrite Order (JSON)", type: "json", required: true },
  ],
  output: [
    { key: "orderNumber", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "items", type: "array", label: "Items" },
    { key: "costs", type: "object", label: "Costs" },
    { key: "source", type: "string", label: "Source" },
    { key: "sourceId", type: "string", label: "Source ID" },
  ],

  execute(input) {
    return eventbriteOrderToCohost(input.order);
  },
};

export default eventbriteOrderToCohostAction;
