import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  session: string;
}

/**
 * POST /cart/sessions/{session}/payment/payment-intent — get-or-create the
 * payment intent for a cart.
 *
 * For Authorize.Net carts the response carries `paymentRequest.transactionRequest`,
 * a ready-to-merge Accept Hosted payload. It is built fresh per request and never
 * persisted on the cart, so re-run this action rather than caching the result.
 */
const createCartPaymentIntent: ActionDefinition<Input> = {
  key: "create-cart-payment-intent",
  type: "perform",
  resource: "cart",
  title: "Create Cart Payment Intent",
  description: "Get or create the payment intent for a Cohost cart session.",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
  ],
  output: [
    { key: "paymentIntentId", type: "string", label: "Payment Intent ID" },
    { key: "client_secret", type: "string", label: "Client Secret" },
    { key: "provider", type: "string", label: "Provider" },
    { key: "publicClientKey", type: "string", label: "Public Client Key" },
    { key: "apiLoginId", type: "string", label: "API Login ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "paymentRequest", type: "object", label: "Payment Request (Authorize.Net)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating cart payment intent", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(
      `/cart/sessions/${encodeURIComponent(input.session)}/payment/payment-intent`,
      { method: "POST" },
    );
  },
};

export default createCartPaymentIntent;
