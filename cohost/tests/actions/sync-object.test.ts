import { expect, test } from "vitest";
import app from "../../index.ts";
import action from "../../actions/sync-object.ts";
import { mockCtx } from "../_helpers.ts";

const urn = "urn:1:co_1:cohost-falcon:/events/e1";
const mappedUrn = "urn:1:co_1:conn_eb:/events/123";
const mappedUrnLabels = { source: "eventbrite" };
const saved = { type: "event", urn, mappedUrn, mappedUrnLabels, id: "e1", data: { id: "e1", name: "Fest" }, meta: { action: "create", changed: ["name"] } };

test("sync-object: posts the envelope to /rms/sync and returns the saved object", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: saved } }]);
  expect(await action.execute({ type: "event", data: { name: "Fest" }, mappedUrn, mappedUrnLabels }, ctx)).toEqual(saved);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/rms/sync");
  expect(JSON.parse(calls[0].body!)).toEqual({ type: "event", data: { name: "Fest" }, mappedUrn, mappedUrnLabels });
  expect(app.actions.find(a => a.key === action.key)).toBeDefined();
  expect(action.idempotent).toBe(true);
});

test("asks only for type, data, mapped URN, its labels, and an optional Cohost URN", () => {
  expect(action.params?.map(p => p.key)).toEqual(["type", "data", "mappedUrn", "mappedUrnLabels", "urn"]);
});

test("takes a transformer's whole output as data: unwraps it, its type wins, its urn is the mapped URN", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: {} } }]);
  const event = { urn: mappedUrn, name: "Fest" };
  await action.execute({ type: "order", data: { type: "event", urn: mappedUrn, data: event } }, ctx);
  expect(JSON.parse(calls[0].body!)).toEqual({ type: "event", data: event, mappedUrn });
});

test("an explicit URN wins over the transformer output's", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: {} } }, { body: { status: "ok", data: {} } }]);
  const other = "urn:1:co_1:conn_eb:/events/999";
  await action.execute({ type: "event", data: { type: "event", urn: mappedUrn, data: {} }, mappedUrn: other }, ctx);
  expect(JSON.parse(calls[0].body!)).toEqual({ type: "event", data: {}, mappedUrn: other });
  await action.execute({ type: "event", data: { type: "event", urn: mappedUrn, data: {} }, urn }, ctx);
  expect(JSON.parse(calls[1].body!)).toEqual({ type: "event", data: {}, urn });
});

test("without a URN, uses the object's own: remote → mapped URN, ours → Cohost URN, an order body's order.urn", async () => {
  const { ctx, calls } = mockCtx([1, 2, 3].map(() => ({ body: { status: "ok", data: {} } })));
  await action.execute({ type: "event", data: { urn: mappedUrn } }, ctx);
  expect(JSON.parse(calls[0].body!)).toMatchObject({ mappedUrn });
  await action.execute({ type: "event", data: { urn } }, ctx);
  expect(JSON.parse(calls[1].body!)).toEqual({ type: "event", data: { urn }, urn });
  const orderUrn = "urn:1:co_1:conn_eb:/orders/9";
  await action.execute({ type: "order", data: { order: { urn: orderUrn }, source: {} } }, ctx);
  expect(JSON.parse(calls[2].body!)).toMatchObject({ type: "order", mappedUrn: orderUrn });
});

test("sends our URN alone when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: {} } }]);
  await action.execute({ type: "ticket", data: { event_urn: mappedUrn }, urn }, ctx);
  expect(JSON.parse(calls[0].body!)).toEqual({ type: "ticket", data: { event_urn: mappedUrn }, urn });
});

test.each([
  { type: "attendee", data: {}, urn },
  { type: "event", data: [], urn },
  { type: "event", data: null, urn },
  { type: "event", data: {} },
  { type: "event", data: {}, mappedUrn: "" },
  { type: "event", data: { urn: "" } },
  { type: "event", data: {}, mappedUrn: { urn: mappedUrn } },
  { type: "event", data: {}, mappedUrn, mappedUrnLabels: [] },
  { type: "event", data: {}, mappedUrn, mappedUrnLabels: "x" },
])("invalid input fails before making a request: %j", async input => {
  const { ctx, calls } = mockCtx([]);
  await expect(action.execute(input as never, ctx)).rejects.toThrow();
  expect(calls).toHaveLength(0);
});
