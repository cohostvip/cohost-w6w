import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { couponOutput } from "../lib/params.ts";

interface Input {
  coupon: string;
  /** Sent flat — coupons do not wrap their bodies. */
  patch: Record<string, unknown>;
}

/** PATCH /coupons/{coupon} — partial update of a coupon. */
const updateCoupon: ActionDefinition<Input> = {
  key: "update-coupon",
  type: "perform",
  resource: "coupon",
  title: "Update Coupon",
  description: "Partially update a Cohost coupon.",
  idempotent: true,
  params: [
    { key: "coupon", label: "Coupon ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Partial coupon fields, e.g. { "discountValue": 25, "maxUses": 150 }. id/companyId/created/updated are not accepted.',
    },
  ],
  output: couponOutput,

  async execute(input, ctx) {
    ctx.log("info", "updating coupon", { coupon: input.coupon });
    const client = new CohostClient(ctx);
    return client.request(`/coupons/${encodeURIComponent(input.coupon)}`, {
      method: "PATCH",
      body: input.patch,
    });
  },
};

export default updateCoupon;
