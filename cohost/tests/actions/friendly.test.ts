import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import friendlyValue from "../../actions/friendly-value.ts";
import friendlyData from "../../actions/friendly-data.ts";

const action = (key: string) => app.actions.find((a) => a.key === key)!;

test("friendly-value: converts an amount", async () => {
  const { ctx } = mockCtx();
  expect(await friendlyValue.execute({ value: "USD,5500" }, ctx)).toMatchObject({ kind: "currency", display: "$55" });
});

test("friendly-value: an unrecognised value comes back as unknown", async () => {
  const { ctx } = mockCtx();
  expect(await friendlyValue.execute({ value: "hello" }, ctx)).toEqual({ kind: "unknown", raw: "hello" });
});

test("friendly-data: converts an object, no API call", async () => {
  const { ctx, calls } = mockCtx();
  const out = (await friendlyData.execute({ data: { costs: { total: "USD,5500" } } }, ctx)) as any;
  expect(out.costs.total.displayPadded).toBe("$55.00");
  expect(calls).toHaveLength(0);
});

test("get-order: unchecked friendly flag returns the API's raw amounts", async () => {
  const { ctx } = mockCtx([{ body: { id: "ord_1", costs: { total: "USD,5500" } } }]);
  const out = (await action("get-order").execute({ order: "ord_1" }, ctx)) as any;
  expect(out.costs.total).toBe("USD,5500");
});

test("get-order: friendly flag returns the order pre-formatted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ord_1", costs: { total: "USD,5500" } } }]);
  const out = (await action("get-order").execute({ order: "ord_1", friendly: true }, ctx)) as any;
  expect(out.id).toBe("ord_1");
  expect(out.costs.total).toMatchObject({ kind: "currency", display: "$55", raw: "USD,5500" });
  expect(new URL(calls[0].url).search).toBe("");
});
