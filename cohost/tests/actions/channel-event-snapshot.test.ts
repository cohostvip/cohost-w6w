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
  // M5: no listingId returns primary even when listings[0] is non-primary
  expect(await pick([extra, primary])).toEqual(primary);
});

test("listing selection: id match among 3 (requested second, primary third)", async () => {
  const l3 = { listingId: "l3", properties: {} };
  const { ctx } = mockCtx([ok([extra, l3, primary]), ok({ status: "live" }), ok([]), ok({}), ok([])]);
  const r = await run({ ...input, listingId: "l3" }, ctx);
  expect(r.listing).toEqual(l3);
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
  const fail: MockResponse = { status, statusText: "x", body: "no" };
  const { ctx } = mockCtx([ok([primary]), fail, ok([]), ok({}), ok([])]);
  await expect(action.execute(input, ctx)).rejects.toThrow(`Cohost ${status} x for GET /v1/events/e1:`);
  const t = mockCtx([ok([primary]), ok({ status: "live" }), fail, ok({}), ok([])]);
  await expect(action.execute(input, t.ctx)).rejects.toThrow(`Cohost ${status} x for GET /v1/events/e1/tickets`);
});

test("the five id-only reads are in flight together, not one after another", async () => {
  const base = mockCtx([ok([primary]), ok({ status: "live" }), ok([{ id: "t1" }]), ok({}), ok([])]);
  let inFlight = 0;
  let most = 0;
  const ctx = {
    ...base.ctx,
    fetch: async (url: RequestInfo | URL, init?: RequestInit) => {
      const res = base.ctx.fetch(url, init);
      most = Math.max(most, ++inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight--;
      return res;
    },
  } as typeof base.ctx;
  await run(input, ctx);
  expect(most).toBe(5);
});

test("mappingLabels: event + ticket mappings in one search, split by kind", async () => {
  const ev = { urn: "ue", labels: { provider: "flite", kind: "event" }, meta: {} };
  const tk = { urn: "ut", labels: { provider: "flite", kind: "ticket" }, meta: {} };
  const { ctx, calls } = mockCtx([
    ok([primary]), ok({ status: "live" }), ok([{ id: "t1" }, { id: "t2" }]), ok({}), ok([]),
    // a counterpart of the wrong kind is not a mapping of that resource
    ok({ "urn:1:co_1:cohost-falcon:/events/e1": [ev, tk], "urn:1:co_1:cohost-falcon:/events/e1/tickets/t2": [tk, ev] }),
  ]);
  // a `kind` in the labels is the snapshot's to set, never sent as a filter
  const r = await run({ ...input, mappingLabels: { provider: "flite", kind: "x" } }, ctx);
  const rms = calls.filter(c => /rms\/urn\/search/.test(c.url));
  expect(rms.map(c => [c.method, JSON.parse(c.body!)])).toEqual([[
    "POST",
    {
      urns: [
        "urn:1:co_1:cohost-falcon:/events/e1",
        "urn:1:co_1:cohost-falcon:/events/e1/tickets/t1",
        "urn:1:co_1:cohost-falcon:/events/e1/tickets/t2",
      ],
      labels: { provider: "flite" },
    },
  ]]);
  expect(r.mappings).toEqual({ event: [ev], tickets: { t1: [], t2: [tk] } });
});

test("a Cohost without the batch search (404): single-URN GETs, still split by kind", async () => {
  const tk = { urn: "ut", labels: { kind: "ticket" }, meta: {} };
  const { ctx, calls, logs } = mockCtx([
    ok([primary]), ok({ status: "live" }), ok([{ id: "t1" }]), ok({}), ok([]),
    nf, ok([tk]), ok([tk]),
  ]);
  const r = await run({ ...input, mappingLabels: { provider: "flite" } }, ctx);
  const gets = calls.filter(c => /rms\/urn\/search\?/.test(c.url)).map(c => new URL(c.url).searchParams);
  expect(gets.map(p => [p.get("urn"), JSON.parse(p.get("labels")!)])).toEqual([
    ["urn:1:co_1:cohost-falcon:/events/e1", { provider: "flite" }],
    ["urn:1:co_1:cohost-falcon:/events/e1/tickets/t1", { provider: "flite" }],
  ]);
  expect(r.mappings).toEqual({ event: [], tickets: { t1: [tk] } });
  expect(logs.some(l => l.level === "warn" && /batch URN search unavailable/.test(l.message))).toBe(true);
});

test("a batch search failure other than 404 fails the snapshot", async () => {
  const { ctx } = mockCtx([
    ok([primary]), ok({ status: "live" }), ok([]), ok({}), ok([]),
    { status: 500, statusText: "Server Error", body: "boom" },
  ]);
  await expect(run({ ...input, mappingLabels: {} }, ctx)).rejects.toThrow("Cohost 500");
});

test("no mappingLabels: zero RMS requests even with tickets", async () => {
  const { ctx, calls } = mockCtx([ok([primary]), ok({ status: "live" }), ok([{ id: "t1" }]), ok({}), ok([])]);
  const r = await run(input, ctx);
  expect(calls).toHaveLength(5);
  expect(calls.filter(c => /rms/.test(c.url))).toHaveLength(0);
  expect(r.mappings).toEqual({ event: [], tickets: {} });
});

test("owner tickets requested with status=all; removed ticket kept; channel-only id also looked up once", async () => {
  const m = { urn: "u", labels: { kind: "ticket" }, meta: {} };
  const { ctx, calls } = mockCtx([
    ok([primary]), ok({ status: "live" }), ok([{ id: "t1", status: "removed" }, { id: "t2", status: "live" }]),
    ok({}), ok([{ id: "t2" }, { id: "t3" }]),
    ok({ "urn:1:co_1:cohost-falcon:/events/e1/tickets/t1": [m] }),
  ]);
  const r = await run({ ...input, mappingLabels: { provider: "flite" } }, ctx);
  expect(path(calls[2].url)).toBe("/v1/events/e1/tickets?status=all");
  expect(r.tickets).toEqual([{ id: "t1", status: "removed" }, { id: "t2", status: "live" }]);
  const rms = calls.filter(c => /rms\/urn\/search/.test(c.url));
  expect(rms).toHaveLength(1);
  expect(JSON.parse(rms[0].body!).urns).toEqual([
    "urn:1:co_1:cohost-falcon:/events/e1",
    "urn:1:co_1:cohost-falcon:/events/e1/tickets/t1",
    "urn:1:co_1:cohost-falcon:/events/e1/tickets/t2",
    "urn:1:co_1:cohost-falcon:/events/e1/tickets/t3",
  ]);
  expect(Object.keys(r.mappings.tickets)).toEqual(["t1", "t2", "t3"]);
  expect(r.mappings.tickets).toEqual({ t1: [m], t2: [], t3: [] }); // the removed ticket's mapping is found
});

test("companyId is a hidden param defaulting to the account const (never a field to fill)", () => {
  const p = action.params!.find(x => x.key === "companyId") as unknown as Record<string, unknown>;
  expect(p).toMatchObject({ hidden: true, default: "{{ const.account_id }}", required: true });
});

test("URNs are named under the owner event's company when it reports one", async () => {
  const { ctx } = mockCtx([ok([primary]), ok({ id: "e1", status: "live", companyId: "co_owner" }), ok([]), ok({}), ok([])]);
  const r = await run(input, ctx);
  expect(r.companyId).toBe("co_owner");
  expect(r.eventUrn).toBe("urn:1:co_owner:cohost-falcon:/events/e1");
});

test("no companyId anywhere fails instead of naming a URN under an empty company", async () => {
  const { ctx } = mockCtx([ok([primary]), ok({ id: "e1", status: "live" }), ok([]), ok({}), ok([])]);
  await expect(run({ channelId: "ch1", eventId: "e1" }, ctx)).rejects.toThrow(/companyId/);
});

test("42 tickets, 3 on the channel: every mapping in ONE RMS request (was 43 sequential GETs)", async () => {
  const owner = Array.from({ length: 42 }, (_, i) => ({ id: `t${i}` }));
  const urn = (id: string) => `urn:1:co_1:cohost-falcon:/events/e1/tickets/${id}`;
  const flite = (id: string) => ({ urn: `urn:1:co_1:conn_f:/tickets/${id}`, labels: { provider: "flite", kind: "ticket" }, meta: {} });
  const fliteEvent = { urn: "urn:1:co_1:conn_f:/events/9", labels: { provider: "flite", kind: "event" }, meta: {} };
  const { ctx, calls } = mockCtx([
    ok([primary]), ok({ status: "live" }), ok(owner), ok({}), ok(owner.slice(0, 3)),
    ok({
      "urn:1:co_1:cohost-falcon:/events/e1": [fliteEvent],
      ...Object.fromEntries(["t0", "t1", "t2"].map(id => [urn(id), [flite(id)]])),
    }),
  ]);
  const r = await run({ ...input, mappingLabels: { provider: "flite" } }, ctx);
  const rms = calls.filter(c => /rms\/urn\/search/.test(c.url));
  expect(rms).toHaveLength(1);
  expect(calls).toHaveLength(6);
  expect(rms[0].method).toBe("POST");
  expect(JSON.parse(rms[0].body!)).toEqual({
    urns: ["urn:1:co_1:cohost-falcon:/events/e1", ...owner.map(t => urn(t.id))],
    labels: { provider: "flite" },
  });
  expect(r.mappings.event).toEqual([fliteEvent]);
  expect(Object.keys(r.mappings.tickets)).toHaveLength(42);
  expect(r.mappings.tickets.t1).toEqual([flite("t1")]);
  expect(r.mappings.tickets.t41).toEqual([]);
});
