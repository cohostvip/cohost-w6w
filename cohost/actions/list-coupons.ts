import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import type { Coupon } from "../lib/types.ts";

interface Input {
  /** Optional event filter, forwarded as `?eventId=`. */
  eventId?: string;
}

/**
 * GET /coupons — coupons for the authenticated company.
 *
 * Note: the coupons surface is list-only for reads — there is no
 * `GET /coupons/{id}`. The API answers with a bare array, wrapped here as
 * `{ results }`.
 */
const listCoupons: ActionDefinition<Input> = {
  key: "list-coupons",
  type: "read",
  resource: "coupon",
  title: "List Coupons",
  description: "List Cohost coupons for the authenticated company.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Optional. Restrict to coupons scoped to one event.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Coupons" }],

  async execute(input, ctx) {
    ctx.log("info", "listing coupons", { eventId: input.eventId });
    const client = new CohostClient(ctx);
    const results = await client.request<Coupon[]>("/coupons", {
      query: { eventId: input.eventId },
    });
    return { results };
  },
};

export default listCoupons;
