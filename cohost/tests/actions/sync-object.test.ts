import { expect, test } from "vitest";
import app from "../../index.ts";
import action from "../../actions/sync-object.ts";
import { mockCtx } from "../_helpers.ts";

const urn = "urn:1:co_1:cohost-falcon:/events/e1";
const mappedUrn = { urn: "urn:1:co_1:conn_eb:/events/123", labels: { source: "eventbrite" } };
const saved = { type: "event", urn, mappedUrn, id: "e1", data: { id: "e1", name: "Fest" }, meta: { action: "create", changed: ["name"] } };

test("sync-object: posts the envelope to /rms/sync and returns the saved object", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: saved } }]);
  expect(await action.execute({ type: "event", data: { name: "Fest" }, mappedUrn }, ctx)).toEqual(saved);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/rms/sync");
  expect(JSON.parse(calls[0].body!)).toEqual({ type: "event", data: { name: "Fest" }, mappedUrn });
  expect(app.actions.find(a => a.key === action.key)).toBeDefined();
  expect(action.idempotent).toBe(true);
});

test("sends our URN and a ticket's eventId when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: {} } }]);
  await action.execute({ type: "ticket", data: {}, urn, eventId: "e1" }, ctx);
  expect(JSON.parse(calls[0].body!)).toEqual({ type: "ticket", data: {}, urn, eventId: "e1" });
});

test.each([
  { type: "attendee", data: {}, urn },
  { type: "event", data: [], urn },
  { type: "event", data: null, urn },
  { type: "event", data: {} },
  { type: "event", data: {}, mappedUrn: "urn:1:co_1:conn_eb:/events/123" },
  { type: "event", data: {}, mappedUrn: { labels: {} } },
  { type: "event", data: {}, mappedUrn: { urn: "" } },
])("invalid input fails before making a request: %j", async input => {
  const { ctx, calls } = mockCtx([]);
  await expect(action.execute(input as never, ctx)).rejects.toThrow();
  expect(calls).toHaveLength(0);
});
