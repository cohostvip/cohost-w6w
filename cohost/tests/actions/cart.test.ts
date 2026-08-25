import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import startCartSession from "../../actions/start-cart-session.ts";
import getCartSession from "../../actions/get-cart-session.ts";
import updateCartSession from "../../actions/update-cart-session.ts";
import cancelCartSession from "../../actions/cancel-cart-session.ts";
import updateCartItem from "../../actions/update-cart-item.ts";
import preValidateCartPayment from "../../actions/pre-validate-cart-payment.ts";
import createCartPaymentIntent from "../../actions/create-cart-payment-intent.ts";
import processCartPayment from "../../actions/process-cart-payment.ts";
import placeCartOrder from "../../actions/place-cart-order.ts";
import joinCartTable from "../../actions/join-cart-table.ts";
import applyCartCoupon from "../../actions/apply-cart-coupon.ts";
import removeCartCoupon from "../../actions/remove-cart-coupon.ts";

test("start-cart-session: POSTs /cart/sessions with a flat body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await startCartSession.execute({ contextId: "evt_1" }, ctx);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions");
  expect(JSON.parse(calls[0].body!)).toEqual({ contextId: "evt_1" });
});

test("get-cart-session: GETs /cart/sessions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await getCartSession.execute({ session: "cs_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1");
});

test("update-cart-session: PATCHes with an unwrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await updateCartSession.execute({ session: "cs_1", patch: { customer: { email: "a@b.c" } } }, ctx);
  expect(calls[0].method).toBe("PATCH");
  expect(JSON.parse(calls[0].body!)).toEqual({ customer: { email: "a@b.c" } });
});

test("cancel-cart-session: DELETEs and reports the cancelled id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await cancelCartSession.execute({ session: "cs_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(out).toEqual({ cancelled: true, id: "cs_1" });
});

test("update-cart-item: POSTs /item with an absolute quantity", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await updateCartItem.execute({ session: "cs_1", itemId: "tkt_1", quantity: 0 }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/item");
  expect(JSON.parse(calls[0].body!)).toEqual({ itemId: "tkt_1", quantity: 0 });
});

test("pre-validate-cart-payment: POSTs the pre-validate path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await preValidateCartPayment.execute({ session: "cs_1", data: { zip: "10001" } }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/payment/pre-validate");
  expect(JSON.parse(calls[0].body!)).toEqual({ zip: "10001" });
});

test("create-cart-payment-intent: POSTs the payment-intent path with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { paymentIntentId: "pi_1" } }]);
  const out = await createCartPaymentIntent.execute({ session: "cs_1" }, ctx);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/payment/payment-intent");
  expect(calls[0].body).toBeNull();
  expect((out as { paymentIntentId: string }).paymentIntentId).toBe("pi_1");
});

test("process-cart-payment: POSTs the process path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await processCartPayment.execute({ session: "cs_1", data: { token: "t" } }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/payment/process");
});

test("place-cart-order: POSTs place-order with the inline transaction", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "ok", id: "ord_1" } }]);
  const out = await placeCartOrder.execute(
    { session: "cs_1", transaction: { provider: "authnet", transId: "123" } },
    ctx,
  );
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/place-order");
  expect(JSON.parse(calls[0].body!).transaction).toEqual({ provider: "authnet", transId: "123" });
  expect((out as { id: string }).id).toBe("ord_1");
});

test("place-cart-order and process-cart-payment are marked non-idempotent", () => {
  expect(placeCartOrder.idempotent).toBe(false);
  expect(processCartPayment.idempotent).toBe(false);
});

test("join-cart-table: POSTs join-table with the commitment id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await joinCartTable.execute({ session: "cs_1", tableCommitmentId: "tc_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/join-table");
  expect(JSON.parse(calls[0].body!)).toEqual({ tableCommitmentId: "tc_1" });
});

test("apply-cart-coupon: POSTs the code to /coupons", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await applyCartCoupon.execute({ session: "cs_1", code: "SUMMER" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/coupons");
  expect(JSON.parse(calls[0].body!)).toEqual({ code: "SUMMER" });
});

test("remove-cart-coupon: DELETEs the nested coupon path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cs_1" } }]);
  await removeCartCoupon.execute({ session: "cs_1", coupon: "cpn_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/cart/sessions/cs_1/coupons/cpn_1");
});
