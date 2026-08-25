import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { couponOutput } from "../lib/params.ts";

interface Input {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses?: number;
  expiresAt?: string;
  eventId?: string;
}

/**
 * POST /coupons — create a coupon.
 *
 * Body is flat (coupons do not wrap). `companyId` is forced from the token and
 * `id`/`created`/`updated` are server-assigned, so none of them are accepted here.
 */
const createCoupon: ActionDefinition<Input> = {
  key: "create-coupon",
  type: "perform",
  resource: "coupon",
  title: "Create Coupon",
  description: "Create a Cohost coupon for the authenticated company.",
  idempotent: false,
  params: [
    { key: "code", label: "Code", type: "string", required: true },
    {
      key: "discountType",
      label: "Discount Type",
      type: "select",
      required: true,
      options: [
        { value: "percentage", label: "Percentage" },
        { value: "fixed", label: "Fixed amount" },
      ],
    },
    {
      key: "discountValue",
      label: "Discount Value",
      type: "number",
      required: true,
      validation: { min: 0 },
    },
    { key: "maxUses", label: "Max Uses", type: "number", validation: { integer: true, min: 1 } },
    { key: "expiresAt", label: "Expires At", type: "datetime" },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Optional. Scope the coupon to a single event.",
    },
  ],
  output: couponOutput,

  async execute(input, ctx) {
    ctx.log("info", "creating coupon", { code: input.code });
    const client = new CohostClient(ctx);
    return client.request("/coupons", {
      method: "POST",
      body: {
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt,
        eventId: input.eventId,
      },
    });
  },
};

export default createCoupon;
