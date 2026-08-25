import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import listOrders from "../../actions/list-orders.ts";
import listOrderAttendees from "../../actions/list-order-attendees.ts";
import sendOrderConfirmation from "../../actions/send-order-confirmation.ts";

test("list-orders: GETs /orders with status + date filters and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listOrders.execute(
    { status: "placed", startDate: "2026-01-01", endDate: "2026-02-01", page: 3, size: 50 },
    ctx,
  );
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/orders");
  expect(url.searchParams.get("status")).toBe("placed");
  expect(url.searchParams.get("startDate")).toBe("2026-01-01");
  expect(url.searchParams.get("endDate")).toBe("2026-02-01");
  expect(url.searchParams.get("page")).toBe("3");
  expect(url.searchParams.get("size")).toBe("50");
});

test("list-orders: omits absent filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listOrders.execute({}, ctx);
  expect(new URL(calls[0].url).search).toBe("");
});

test("list-order-attendees: wraps the bare array and forwards uid", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "att_1" }] }]);
  const out = await listOrderAttendees.execute({ order: "ord_1", uid: "user_9" }, ctx);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/orders/ord_1/attendees");
  expect(url.searchParams.get("uid")).toBe("user_9");
  expect(out).toEqual({ results: [{ id: "att_1" }] });
});

test("send-order-confirmation: POSTs /orders/{id}/send-confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { response: "sent" } }]);
  const out = await sendOrderConfirmation.execute({ order: "ord_1" }, ctx);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/orders/ord_1/send-confirmation");
  expect(out).toEqual({ response: "sent" });
});

test("send-order-confirmation: is marked non-idempotent (it emails the customer)", () => {
  expect(sendOrderConfirmation.idempotent).toBe(false);
});
