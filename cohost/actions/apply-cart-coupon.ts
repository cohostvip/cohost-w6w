import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  code: string;
}

/** POST /cart/sessions/{session}/coupons — apply a coupon code to the cart. */
const applyCartCoupon: ActionDefinition<Input> = {
  key: "apply-cart-coupon",
  type: "perform",
  resource: "cart",
  title: "Apply Cart Coupon",
  description: "Apply a coupon code to a Cohost cart session.",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    { key: "code", label: "Coupon Code", type: "string", required: true },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "applying cart coupon", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(`/cart/sessions/${encodeURIComponent(input.session)}/coupons`, {
      method: "POST",
      body: { code: input.code },
    });
  },
};

export default applyCartCoupon;
