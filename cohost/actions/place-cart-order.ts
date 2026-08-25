import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  session: string;
  skipPaymentValidationToken?: string;
  /** `{ provider: 'authnet', transId, iframeResponse? }`. */
  transaction?: Record<string, unknown>;
}

/**
 * POST /cart/sessions/{session}/place-order — close the cart and create the order.
 *
 * For paid Authorize.Net carts pass `transaction`; the server re-fetches the
 * transaction from the gateway and verifies status/amount/currency before
 * persisting, so the client-supplied payload is a hint, never the source of truth.
 *
 * Creates an order: not safe to retry blindly.
 */
const placeCartOrder: ActionDefinition<Input> = {
  key: "place-cart-order",
  type: "perform",
  resource: "cart",
  title: "Place Cart Order",
  description: "Close a Cohost cart session and place the order.",
  idempotent: false,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    {
      key: "transaction",
      label: "Transaction",
      type: "json",
      hint: 'Paid carts: { "provider": "authnet", "transId": "…", "iframeResponse": { … } }.',
    },
    {
      key: "skipPaymentValidationToken",
      label: "Skip Payment Validation Token",
      type: "secret",
      hint: "Only for flows explicitly authorised to bypass payment validation.",
    },
  ],
  output: [
    { key: "result", type: "string", label: "Result" },
    { key: "id", type: "string", label: "Order ID" },
    { key: "uid", type: "string", label: "User ID" },
    { key: "redirUri", type: "string", label: "Redirect URI" },
    { key: "accessToken", type: "string", label: "Access Token" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "placing cart order", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(`/cart/sessions/${encodeURIComponent(input.session)}/place-order`, {
      method: "POST",
      body: {
        skipPaymentValidationToken: input.skipPaymentValidationToken,
        transaction: input.transaction,
      },
    });
  },
};

export default placeCartOrder;
