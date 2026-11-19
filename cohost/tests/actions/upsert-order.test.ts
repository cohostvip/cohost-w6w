import { expect, test } from "vitest";
import app from "../../index.ts";
import action from "../../actions/upsert-order.ts";
import { mockCtx } from "../_helpers.ts";

const urn = "urn:1:co_1:conn_eb:/orders/O1";
const order = { urn, contextId: "urn:1:co_1:conn_eb:/events/E1", orderNumber: "O1", items: [{ id: "A1", quantity: 1 }] };
const source = { system: "eventbrite", externalId: "O1" };
const attendees = [{ orderItemId: "A1", index: 0, barcodes: ["B1"], checkedIn: false, status: "attending" }];
const saved = { order: { id: "ord_1", orderNumber: "O1" }, meta: { action: "create", changed: [] } };

test("upsert-order: posts the transformer's data as the POST /v1/orders body and returns the saved order", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: saved } }]);
  expect(await action.execute({ data: { order, source, attendees } }, ctx)).toEqual(saved);
  expect(calls[0].method).toBe("POST");
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/orders");
  expect(url.searchParams.get("meta")).toBe("1");
  expect(JSON.parse(calls[0].body!)).toEqual({ order, source, attendees });
  expect(app.actions.find((a) => a.key === action.key)).toBeDefined();
  expect(action.params?.map((p) => p.key)).toEqual(["data"]);
});

test.each([
  null,
  [],
  { ...order },
  { order: [] },
  { order: { ...order, urn: undefined } },
  { order: { ...order, urn: "" } },
  { order, source, attendees: {} },
  { order, mappedUrn: urn },
])("invalid data fails before making a request: %j", async (data) => {
  const { ctx, calls } = mockCtx([]);
  await expect(action.execute({ data } as never, ctx)).rejects.toThrow();
  expect(calls).toHaveLength(0);
});
