import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  data?: Record<string, unknown>;
}

/**
 * POST /cart/sessions/{session}/payment/pre-validate — check the cart is
 * checkout-ready before creating a payment intent.
 */
const preValidateCartPayment: ActionDefinition<Input> = {
  key: "pre-validate-cart-payment",
  type: "perform",
  resource: "cart",
  title: "Pre-validate Cart Payment",
  description: "Validate a Cohost cart session for payment and checkout.",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    {
      key: "data",
      label: "Validation Payload",
      type: "json",
      hint: "Free-form payload forwarded to the API.",
    },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "pre-validating cart payment", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(
      `/cart/sessions/${encodeURIComponent(input.session)}/payment/pre-validate`,
      { method: "POST", body: input.data ?? {} },
    );
  },
};

export default preValidateCartPayment;
