import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  data?: Record<string, unknown>;
}

/**
 * POST /cart/sessions/{session}/payment/process — hand the provider payment
 * payload to the API.
 *
 * Money movement: not safe to retry blindly.
 */
const processCartPayment: ActionDefinition<Input> = {
  key: "process-cart-payment",
  type: "perform",
  resource: "cart",
  title: "Process Cart Payment",
  description: "Process the payment for a Cohost cart session.",
  idempotent: false,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    {
      key: "data",
      label: "Payment Payload",
      type: "json",
      hint: "Provider-specific payment payload forwarded to the API.",
    },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "processing cart payment", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(
      `/cart/sessions/${encodeURIComponent(input.session)}/payment/process`,
      { method: "POST", body: input.data ?? {} },
    );
  },
};

export default processCartPayment;
