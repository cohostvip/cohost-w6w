import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  coupon: string;
}

/** DELETE /cart/sessions/{session}/coupons/{coupon} — drop an applied coupon. */
const removeCartCoupon: ActionDefinition<Input> = {
  key: "remove-cart-coupon",
  type: "perform",
  resource: "cart",
  title: "Remove Cart Coupon",
  description: "Remove an applied coupon from a Cohost cart session.",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    { key: "coupon", label: "Coupon ID", type: "string", required: true },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "removing cart coupon", { session: input.session, coupon: input.coupon });
    const client = new CohostClient(ctx);
    return client.request(
      `/cart/sessions/${encodeURIComponent(input.session)}/coupons/${encodeURIComponent(input.coupon)}`,
      { method: "DELETE" },
    );
  },
};

export default removeCartCoupon;
