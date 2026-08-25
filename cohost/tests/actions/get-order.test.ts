import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-order.ts";

test("get-order: GETs /orders/{order}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ord_1", status: "placed" } }]);
  const out = await action.execute!({ order: "ord_1" }, ctx);
  expect(calls[0].method).toBe("GET");
  expect(new URL(calls[0].url).pathname).toBe("/v1/orders/ord_1");
  expect((out as { id: string }).id).toBe("ord_1");
});

test("get-order: forwards uid as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ order: "ord_1", uid: "user_9" }, ctx);
  expect(new URL(calls[0].url).searchParams.get("uid")).toBe("user_9");
});

test("get-order: does not set an Authorization header (sign injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ order: "ord_1" }, ctx);
  expect(calls[0].headers["authorization"]).toBeUndefined();
});
