import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  /** Order id or URN — passed straight through to the API. */
  order: string;
  /** Optional user id, forwarded as `?uid=` for auth context. */
  uid?: string;
}

/**
 * GET /orders/{order} — fetch a single order by id or URN.
 *
 * This is the fetch primitive both workflows depend on: an `order-placed` /
 * `order-changed` trigger delivers the order (with its id), and this action reads
 * back the current order state.
 */
const getOrder: ActionDefinition<Input> = {
  key: "get-order",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch a Cohost order by id or URN.",
  params: [
    {
      key: "order",
      label: "Order (ID or URN)",
      type: "string",
      required: true,
    },
    {
      key: "uid",
      label: "User ID",
      type: "string",
      hint: "Optional. Forwarded as ?uid= for auth context.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "orderNumber", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "organizerId", type: "string", label: "Organizer ID" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "items", type: "array", label: "Items" },
    { key: "costs", type: "object", label: "Costs" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "fetching order", { order: input.order });
    const client = new CohostClient(ctx);
    return client.request(`/orders/${encodeURIComponent(input.order)}`, {
      query: { uid: input.uid },
    });
  },
};

export default getOrder;
