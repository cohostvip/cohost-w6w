/**
 * The client mirrors `@cohostvip/cohost-node`'s envelope handling so actions see
 * the same shapes the SDK returns.
 */
import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import { CohostClient } from "../../lib/client.ts";

test("unwraps { status: ok, data } to data", async () => {
  const { ctx } = mockCtx([{ body: { status: "ok", data: { id: "ord_1" } } }]);
  expect(await new CohostClient(ctx).request("/orders/ord_1")).toEqual({ id: "ord_1" });
});

test("unwraps { status: ok, data, pagination } to { results, pagination }", async () => {
  const { ctx } = mockCtx([
    { body: { status: "ok", data: [{ id: "e1" }], pagination: { page: 1, size: 20, total: 1 } } },
  ]);
  expect(await new CohostClient(ctx).request("/events")).toEqual({
    results: [{ id: "e1" }],
    pagination: { page: 1, size: 20, total: 1 },
  });
});

test("passes an un-enveloped body through verbatim", async () => {
  const { ctx } = mockCtx([{ body: { id: "ord_1", status: "placed" } }]);
  expect(await new CohostClient(ctx).request("/orders/ord_1")).toEqual({
    id: "ord_1",
    status: "placed",
  });
});

test("does not unwrap when status is not ok", async () => {
  const { ctx } = mockCtx([{ body: { status: "partial", data: { id: "x" } } }]);
  expect(await new CohostClient(ctx).request("/x")).toEqual({
    status: "partial",
    data: { id: "x" },
  });
});

test("returns undefined for 204 and for an empty 200 body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new CohostClient(ctx);
  expect(await client.request("/a", { method: "DELETE" })).toBeUndefined();
  expect(await client.request("/b", { method: "DELETE" })).toBeUndefined();
});

test("throws with status, method and path on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: "missing" }]);
  await expect(new CohostClient(ctx).request("/orders/nope")).rejects.toThrow(
    /Cohost 404 Not Found for GET \/v1\/orders\/nope: missing/,
  );
});

test("drops empty query values but keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CohostClient(ctx).request("/x", {
    query: { a: undefined, b: null, c: "", d: false, e: 0 },
  });
  const params = new URL(calls[0].url).searchParams;
  expect(params.get("a")).toBeNull();
  expect(params.get("b")).toBeNull();
  expect(params.get("c")).toBeNull();
  expect(params.get("d")).toBe("false");
  expect(params.get("e")).toBe("0");
});
