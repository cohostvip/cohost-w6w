import { expect, test } from "vitest";
import app from "../../index.ts";
import computeAction from "../../actions/compute-digest.ts";
import validateAction from "../../actions/validate-urn-digest.ts";
import { computeDigest } from "../../lib/digest.ts";
import { mockCtx } from "../_helpers.ts";

const urn = "urn:1:co_1:conn_eb:/orders/123";
const order = { id: "123", status: "placed", costs: { gross: 4000 } };

test("both actions are registered; compute-digest is a local, auth-free format action", () => {
  expect(app.actions.find((a) => a.key === "validate-urn-digest")).toBeDefined();
  expect(app.actions.find((a) => a.key === "compute-digest")).toBeDefined();
  expect(computeAction).toMatchObject({ resource: "format", requiresAuth: false, idempotent: true });
  expect(validateAction).toMatchObject({ resource: "urn", type: "read" });
});

test("compute-digest: digests the picked fields and reports them sorted", async () => {
  const out = await computeAction.execute({ data: order, fields: "status, id" }, mockCtx([]).ctx);
  expect(out).toEqual({ digest: await computeDigest(order, ["id", "status"]), fields: ["id", "status"] });
});

test("compute-digest: whole object without fields; requires data", async () => {
  const { ctx } = mockCtx([]);
  expect(await computeAction.execute({ data: order }, ctx)).toEqual({ digest: await computeDigest(order), fields: null });
  await expect(computeAction.execute({} as never, ctx)).rejects.toThrow(/Data is required/);
});

test.each([true, false])("validate-urn-digest: posts urn + digest and returns valid=%s", async (valid) => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: { valid } } }]);
  expect(await validateAction.execute({ urn, digest: "v1:abc" }, ctx)).toEqual({ urn, valid, digest: "v1:abc" });
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/rms/urn/digest/validate");
  expect(JSON.parse(calls[0].body!)).toEqual({ urn, digest: "v1:abc" });
});

test("validate-urn-digest: computes the digest from data + fields when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: { valid: false } } }]);
  const digest = await computeDigest(order, ["id", "status"]);
  expect(await validateAction.execute({ urn, data: order, fields: ["status", "id"] }, ctx)).toEqual({
    urn,
    valid: false,
    digest,
  });
  expect(JSON.parse(calls[0].body!)).toEqual({ urn, digest });
});

test("validate-urn-digest: anything but valid === true is invalid", async () => {
  const { ctx } = mockCtx([{ body: { status: "ok", data: {} } }]);
  expect((await validateAction.execute({ urn, digest: "v1:abc" }, ctx)).valid).toBe(false);
});

test.each([
  { digest: "v1:abc" },
  { urn: "", digest: "v1:abc" },
  { urn },
  { urn, digest: "" },
  { urn, digest: 5 },
  { urn, data: order, fields: [1] },
])("validate-urn-digest: invalid input fails before a request: %j", async (input) => {
  const { ctx, calls } = mockCtx([]);
  await expect(validateAction.execute(input as never, ctx)).rejects.toThrow();
  expect(calls).toHaveLength(0);
});
