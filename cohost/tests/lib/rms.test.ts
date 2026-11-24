import { expect, test } from "vitest";
import { FALLBACK_CONCURRENCY, SEARCH_BATCH, searchMappedResources } from "../../lib/rms.ts";
import { type MockResponse, mockCtx } from "../_helpers.ts";

const ok = (data: unknown): MockResponse => ({ body: { status: "ok", data } });
const urns = (n: number) => Array.from({ length: n }, (_, i) => `urn:1:co:cohost-falcon:/events/e/tickets/t${i}`);

test("no URNs: no request", async () => {
  const { ctx, calls } = mockCtx([]);
  expect(await searchMappedResources(ctx, [])).toEqual({});
  expect(calls).toHaveLength(0);
});

test(`more than ${SEARCH_BATCH} URNs: one POST per ${SEARCH_BATCH}, sent together, every URN answered`, async () => {
  const all = urns(SEARCH_BATCH + 5);
  const hit = { urn: "x", labels: {}, meta: {} };
  const { ctx, calls } = mockCtx([ok({ [all[0]]: [hit] }), ok({ [all[SEARCH_BATCH + 4]]: [hit], stray: [hit] })]);
  const found = await searchMappedResources(ctx, [...all, all[0]], { provider: "flite" });
  expect(calls.map(c => JSON.parse(c.body!).urns.length)).toEqual([SEARCH_BATCH, 5]);
  expect(Object.keys(found)).toEqual(all);
  expect(found[all[0]]).toEqual([hit]);
  expect(found[all[SEARCH_BATCH + 4]]).toEqual([hit]);
  expect(found[all[1]]).toEqual([]);
});

test(`fallback runs at most ${FALLBACK_CONCURRENCY} single searches at once, labels omitted when none`, async () => {
  const all = urns(FALLBACK_CONCURRENCY + 4);
  const base = mockCtx([{ status: 404, statusText: "Not Found", body: "Cannot POST" }, ...all.map(() => ok("not-an-array"))]);
  let inFlight = 0;
  let most = 0;
  const ctx = {
    ...base.ctx,
    fetch: async (url: RequestInfo | URL, init?: RequestInit) => {
      const res = base.ctx.fetch(url, init);
      most = Math.max(most, ++inFlight);
      await new Promise(resolve => setTimeout(resolve, 2));
      inFlight--;
      return res;
    },
  } as typeof base.ctx;
  const found = await searchMappedResources(ctx, all);
  expect(most).toBe(FALLBACK_CONCURRENCY);
  expect(base.calls.slice(1).every(c => c.method === "GET" && !new URL(c.url).searchParams.has("labels"))).toBe(true);
  expect(Object.values(found).every(v => Array.isArray(v) && v.length === 0)).toBe(true);
});
