import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  coupon: string;
}

/** DELETE /coupons/{coupon} — delete a coupon. Returns no content. */
const deleteCoupon: ActionDefinition<Input> = {
  key: "delete-coupon",
  type: "perform",
  resource: "coupon",
  title: "Delete Coupon",
  description: "Delete a Cohost coupon.",
  idempotent: true,
  params: [
    { key: "coupon", label: "Coupon ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Coupon ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting coupon", { coupon: input.coupon });
    const client = new CohostClient(ctx);
    await client.request(`/coupons/${encodeURIComponent(input.coupon)}`, { method: "DELETE" });
    return { deleted: true, id: input.coupon };
  },
};

export default deleteCoupon;
