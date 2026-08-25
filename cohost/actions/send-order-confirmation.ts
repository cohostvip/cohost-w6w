import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  order: string;
}

/**
 * POST /orders/{order}/send-confirmation — (re)send the order confirmation email.
 *
 * This is the API-side counterpart to the legacy "send confirmation email"
 * workflow: subscribe to `order-placed`, then call this instead of composing the
 * mail yourself. Sending is outward-facing — a retry emails the customer again.
 */
const sendOrderConfirmation: ActionDefinition<Input> = {
  key: "send-order-confirmation",
  type: "perform",
  resource: "order",
  title: "Send Order Confirmation",
  description: "Send the confirmation email for a Cohost order to the customer.",
  idempotent: false,
  params: [
    { key: "order", label: "Order (ID or URN)", type: "string", required: true },
  ],
  output: [{ key: "response", type: "object", label: "Response" }],

  async execute(input, ctx) {
    ctx.log("info", "sending order confirmation", { order: input.order });
    const client = new CohostClient(ctx);
    return client.request(`/orders/${encodeURIComponent(input.order)}/send-confirmation`, {
      method: "POST",
    });
  },
};

export default sendOrderConfirmation;
