import { expect, test } from "vitest";
import app from "../../index.ts";
import action from "../../actions/register-urn-mappings.ts";
import single from "../../actions/register-urn-mapping.ts";
import snapshot from "../../actions/get-channel-event-snapshot.ts";
import { mockCtx } from "../_helpers.ts";

const item = (n: number, labels?: Record<string, unknown>) => ({
  urn: `urn:1:co_1:cohost-falcon:/events/e${n}`,
  mappedUrn: `urn:1:co_1:flite-sandbox:/events/${n}`,
  ...(labels ? { labels } : {}),
});

test("registers one POST per item, in order, bodies identical to register-urn-mapping", async () => {
  const items = [item(1, { kind: "event" }), item(2), item(3, { kind: "ticket", id: "9" })];
  const batch = mockCtx(items.map((_, i) => ({ body: { status: "ok", data: { urn: `r${i}` } } })));
  const out = await action.execute({ mappings: items }, batch.ctx);
  expect(out).toEqual({ count: 3, results: [{ urn: "r0" }, { urn: "r1" }, { urn: "r2" }] });
  expect(batch.calls).toHaveLength(3);
  for (const [i, it] of items.entries()) {
    const one = mockCtx([{ body: {} }]);
    await single.execute(it, one.ctx);
    expect(batch.calls[i].method).toBe("POST");
    expect(new URL(batch.calls[i].url).pathname).toBe("/v1/rms/urn/mappings");
    expect(JSON.parse(batch.calls[i].body!)).toEqual(JSON.parse(one.calls[0].body!));
  }
});

test("empty batch makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  expect(await action.execute({ mappings: [] }, ctx)).toEqual({ count: 0, results: [] });
  expect(calls).toHaveLength(0);
});

test("an invalid item fails the batch", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await expect(action.execute({ mappings: [item(1), { urn: "x", mappedUrn: "y" }] }, ctx)).rejects.toThrow();
});

test("both new actions are registered with the right resource and friendly flag", () => {
  for (const [a, resource] of [[action, "urn"], [snapshot, "channel"]] as const) {
    const reg = app.actions.find((x) => x.key === a.key);
    expect(reg, a.key).toBeDefined();
    expect(reg!.resource).toBe(resource);
  }
  const flag = app.actions.find((x) => x.key === snapshot.key)!.params?.find((p) => p.key === "friendly");
  expect(flag).toMatchObject({ type: "boolean", default: false });
  expect(app.actions.find((x) => x.key === action.key)!.params?.find((p) => p.key === "friendly")).toBeUndefined();
});
