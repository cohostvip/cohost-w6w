import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import listCoupons from "../../actions/list-coupons.ts";
import createCoupon from "../../actions/create-coupon.ts";
import updateCoupon from "../../actions/update-coupon.ts";
import deleteCoupon from "../../actions/delete-coupon.ts";

test("list-coupons: GETs /coupons and wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "cpn_1", code: "SUMMER" }] }]);
  const out = await listCoupons.execute({}, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/coupons");
  expect(out).toEqual({ results: [{ id: "cpn_1", code: "SUMMER" }] });
});

test("list-coupons: forwards eventId as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listCoupons.execute({ eventId: "evt_1" }, ctx);
  expect(new URL(calls[0].url).searchParams.get("eventId")).toBe("evt_1");
});

test("create-coupon: POSTs a flat body (no wrapper)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cpn_1" } }]);
  await createCoupon.execute(
    { code: "SUMMER", discountType: "percentage", discountValue: 20, maxUses: 100 },
    ctx,
  );
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/coupons");
  expect(JSON.parse(calls[0].body!)).toEqual({
    code: "SUMMER",
    discountType: "percentage",
    discountValue: 20,
    maxUses: 100,
  });
});

test("update-coupon: PATCHes /coupons/{id} with a flat body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cpn_1" } }]);
  await updateCoupon.execute({ coupon: "cpn_1", patch: { discountValue: 25 } }, ctx);
  expect(calls[0].method).toBe("PATCH");
  expect(new URL(calls[0].url).pathname).toBe("/v1/coupons/cpn_1");
  expect(JSON.parse(calls[0].body!)).toEqual({ discountValue: 25 });
});

test("delete-coupon: DELETEs and reports the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await deleteCoupon.execute({ coupon: "cpn_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(out).toEqual({ deleted: true, id: "cpn_1" });
});
