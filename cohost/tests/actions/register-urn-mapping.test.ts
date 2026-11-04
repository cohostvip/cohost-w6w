import { expect, test } from "vitest";
import app from "../../index.ts";
import action from "../../actions/register-urn-mapping.ts";
import { mockCtx } from "../_helpers.ts";

const urn = "urn:1:co_1:cohost-falcon:/events/e1";
const mappedUrn = "urn:1:co_1:conn_eb:/events/123";

test("register-urn-mapping: registers both resources and searchable labels on the mapped URN", async () => {
  const labels = { source: "eventbrite", purpose: "sync", capabilities: ["sync_upstream"], custom: { enabled: true } };
  const result = { urn: mappedUrn, labels, resourceUrns: [mappedUrn, urn] };
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: result } }]);
  expect(await action.execute({ urn, mappedUrn, labels }, ctx)).toEqual(result);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/rms/urn/mappings");
  expect(JSON.parse(calls[0].body!)).toEqual({
    urn: mappedUrn, labels, resources: [{ ...labels, urn: mappedUrn }, { urn }],
  });
  expect(app.actions.find(a => a.key === action.key)).toBeDefined();
  expect(action.idempotent).toBe(true);
});

test("no labels are preset, and a label named urn cannot redirect the mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ urn, mappedUrn }, ctx);
  expect(JSON.parse(calls[0].body!).labels).toEqual({});
  await action.execute({ urn, mappedUrn, labels: { urn: "custom-label-value" } }, ctx);
  expect(JSON.parse(calls[1].body!).resources[0].urn).toBe(mappedUrn);
});

test.each([
  { urn: "not-a-urn", mappedUrn },
  { urn, mappedUrn: "urn:1:other:conn_eb:/events/123" },
  { urn, mappedUrn: urn },
  { urn, mappedUrn: urn.replace("cohost-falcon", "cohost-puma") },
  { urn: mappedUrn, mappedUrn: urn },
  { urn, mappedUrn, labels: [] },
])("invalid mapping fails before making a request: %j", async input => {
  const { ctx, calls } = mockCtx([]);
  await expect(action.execute(input as Parameters<typeof action.execute>[0], ctx)).rejects.toThrow();
  expect(calls).toHaveLength(0);
});
