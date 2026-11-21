import { expect, test } from "vitest";
import action from "../../actions/get-channel-event-snapshot.ts";
import type { ChannelEventSnapshot } from "../../actions/get-channel-event-snapshot.ts";
import { mockCtx, type MockResponse } from "../_helpers.ts";

const run = (i: Parameters<typeof action.execute>[0], ctx: Parameters<typeof action.execute>[1]) =>
  action.execute(i, ctx) as Promise<ChannelEventSnapshot>;
const input = { channelId: "ch1", eventId: "e1", companyId: "co_1" };
const ok = (data: unknown): MockResponse => ({ body: { status: "ok", data } });
const nf: MockResponse = { status: 404, statusText: "Not Found", body: "nope" };
const path = (u: string) => new URL(u).pathname + new URL(u).search;
const primary = { listingId: "primary", properties: {} };
const extra = { listingId: "l2", properties: {} };

// order: listings, owner event, owner tickets, channel event, channel tickets
test("live ∧ shown: full view, zero list requests, listing by id match", async () => {
  const { ctx, calls } = mockCtx([
    ok([primary, extra]), ok({ id: "e1", status: "live" }), ok([{ id: "t1", capacity: 10, quantitySold: 3 }]),
    ok({ name: "N" }), ok([{ id: "t1" }]),
  ]);
  const r = await run({ ...input, listingId: "l2" }, ctx);
  expect(r).toMatchObject({
    eventUrn: "urn:1:co_1:cohost-falcon:/events/e1", listing: extra, shown: true, visibility: "visible",
    channelEvent: { name: "N" }, channelTickets: [{ id: "t1" }], tickets: [{ id: "t1", capacity: 10, quantitySold: 3 }],
    mappings: { event: [], tickets: {} },
  });
  expect(calls).toHaveLength(5);
  expect(calls.filter(c => /status=started/.test(c.url))).toHaveLength(0);
  expect(calls.filter(c => /rms/.test(c.url))).toHaveLength(0);
  expect(calls[3].headers["x-cohost-channel-id"]).toBe("ch1");
});

test("listing selection: unmatched id → primary; none → null", async () => {
  const pick = async (listings: unknown[], listingId?: string) => {
    const { ctx } = mockCtx([ok(listings), ok({ status: "live" }), ok([]), ok({}), ok([])]);
    return (await run({ ...input, listingId }, ctx)).listing;
  };
  expect(await pick([extra, primary], "zzz")).toEqual(primary);
  expect(await pick([primary, extra])).toEqual(primary);
  expect(await pick([])).toBeNull();
});

test("started ∧ ¬shown: visibility found on page 2 (hidden)", async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `x${i}`, listing: { visibility: "visible" } }));
  const { ctx, calls } = mockCtx([
    ok([primary]), ok({ id: "e1", status: "started" }), ok([]), nf, nf,
    ok({ items: page1, total: 101 }), ok({ items: [{ id: "e1", listing: { visibility: "hidden" } }], total: 101 }),
  ]);
  const r = await run(input, ctx);
  expect(r).toMatchObject({ shown: false, channelEvent: null, channelTickets: [], visibility: "hidden" });
  const lists = calls.filter(c => /status=started/.test(c.url));
  expect(lists).toHaveLength(2);
  expect(path(lists[0].url)).toContain("limit=100");
  expect(path(lists[0].url)).toContain("offset=0");
  expect(path(lists[1].url)).toContain("offset=100");
});

test("started ∧ ¬shown ∧ absent → visibility null", async () => {
  const { ctx } = mockCtx([ok([primary]), ok({ status: "started" }), ok([]), nf, nf, ok({ items: [], total: 0 })]);
  expect((await run(input, ctx)).visibility).toBeNull();
});

test("¬shown ∧ not started: visibility null, no lookup", async () => {
  const { ctx, calls } = mockCtx([ok([primary]), ok({ status: "ended" }), ok([]), nf, nf]);
  const r = await run(input, ctx);
  expect(r).toMatchObject({ shown: false, visibility: null });
  expect(calls).toHaveLength(5);
});

test.each([403, 404])("owner read %i throws (fail closed)", async status => {
  const { ctx } = mockCtx([ok([primary]), { status, statusText: "x", body: "no" }]);
  await expect(action.execute(input, ctx)).rejects.toThrow(`Cohost ${status}`);
  const t = mockCtx([ok([primary]), ok({ status: "live" }), { status, statusText: "x", body: "no" }]);
  await expect(action.execute(input, t.ctx)).rejects.toThrow(`Cohost ${status}`);
});

test("mappingLabels: event + per-ticket lookups with kind", async () => {
  const m = { urn: "u", labels: {}, meta: {} };
  const { ctx, calls } = mockCtx([
    ok([primary]), ok({ status: "live" }), ok([{ id: "t1" }, { id: "t2" }]), ok({}), ok([]),
    ok([m]), ok([]), ok([m]),
  ]);
  const r = await run({ ...input, mappingLabels: { provider: "flite" } }, ctx);
  const rms = calls.filter(c => /rms\/urn\/search/.test(c.url)).map(c => new URL(c.url).searchParams);
  expect(rms.map(p => [p.get("urn"), JSON.parse(p.get("labels")!)])).toEqual([
    ["urn:1:co_1:cohost-falcon:/events/e1", { provider: "flite", kind: "event" }],
    ["urn:1:co_1:cohost-falcon:/events/e1/tickets/t1", { provider: "flite", kind: "ticket" }],
    ["urn:1:co_1:cohost-falcon:/events/e1/tickets/t2", { provider: "flite", kind: "ticket" }],
  ]);
  expect(r.mappings).toEqual({ event: [m], tickets: { t1: [], t2: [m] } });
});

test("no mappingLabels: zero RMS requests even with tickets", async () => {
  const { ctx, calls } = mockCtx([ok([primary]), ok({ status: "live" }), ok([{ id: "t1" }]), ok({}), ok([])]);
  const r = await run(input, ctx);
  expect(calls).toHaveLength(5);
  expect(calls.filter(c => /rms/.test(c.url))).toHaveLength(0);
  expect(r.mappings).toEqual({ event: [], tickets: {} });
});
