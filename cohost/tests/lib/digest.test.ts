import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { canonicalJson, computeDigest, digestContent, getPath, parseFields } from "../../lib/digest.ts";

const order = {
  id: "123",
  status: "placed",
  changed: "2026-11-01T10:00:00Z",
  costs: { gross: { value: 4000, currency: "USD" } },
  attendees: [{ email: "a@x.com" }],
};

test("canonicalJson sorts keys at every depth and drops undefined", () => {
  expect(canonicalJson({ b: 1, a: { d: [{ z: 1, y: 2 }], c: undefined } })).toBe('{"a":{"d":[{"y":2,"z":1}]},"b":1}');
});

test("getPath walks objects and arrays", () => {
  expect(getPath(order, "costs.gross.value")).toBe(4000);
  expect(getPath(order, "attendees.0.email")).toBe("a@x.com");
  expect(getPath(order, "costs.net.value")).toBeUndefined();
  expect(getPath(null, "id")).toBeUndefined();
});

test("parseFields accepts arrays or comma/newline strings, trimmed, deduped and sorted", () => {
  expect(parseFields(["status", " id ", "status"])).toEqual(["id", "status"]);
  expect(parseFields("status, id\ncosts.gross")).toEqual(["costs.gross", "id", "status"]);
  expect(parseFields(undefined)).toBeUndefined();
  expect(parseFields(null)).toBeUndefined();
  expect(parseFields("")).toBeUndefined();
  expect(parseFields([" ", ""])).toBeUndefined();
  expect(() => parseFields([1])).toThrow(/list of field paths/);
  expect(() => parseFields({ id: true })).toThrow(/list of field paths/);
});

test("digestContent picks fields, missing ones as null", () => {
  expect(digestContent(order, ["id", "nope"])).toEqual({ id: "123", nope: null });
  expect(digestContent(order)).toBe(order);
});

test("computeDigest is v1:<sha256 hex> of the canonical JSON", async () => {
  const expected = createHash("sha256").update('{"id":"123","status":"placed"}').digest("hex");
  expect(await computeDigest(order, ["id", "status"])).toBe(`v1:${expected}`);
});

test("computeDigest ignores key order and unpicked fields, but sees picked changes", async () => {
  const fields = ["id", "status", "costs.gross.value"];
  const base = await computeDigest(order, fields);
  const reordered = { costs: order.costs, status: "placed", id: "123", note: "irrelevant" };
  expect(await computeDigest(reordered, fields)).toBe(base);
  expect(await computeDigest({ ...order, status: "refunded" }, fields)).not.toBe(base);
  expect(await computeDigest({ ...order, costs: undefined }, fields)).not.toBe(base);
});

test("computeDigest digests the whole object without fields, and handles undefined data", async () => {
  expect(await computeDigest(order)).toMatch(/^v1:[0-9a-f]{64}$/);
  expect(await computeDigest(order)).not.toBe(await computeDigest({ ...order, extra: 1 }));
  const nullHash = createHash("sha256").update("null").digest("hex");
  expect(await computeDigest(undefined)).toBe(`v1:${nullHash}`);
});
