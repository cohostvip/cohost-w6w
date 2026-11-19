import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import channelEventChanged, { parseListingPath } from "../../triggers/channel-event-changed.ts";
import app from "../../index.ts";

const SUB = { subscriptionId: "sub_1", callbackUrl: "https://w6w.example/hooks/sub_1", hostUrl: "https://w6w.example" };
const STATE = { webhookId: "wh_1" };
const LISTING = "/channels/ch_1/events/ev_1/listings/primary";

function ping(
  action: string,
  resourcePath = LISTING,
  changedFields?: string[],
  properties?: Record<string, string | number | boolean>,
) {
  const data = { ...(changedFields ? { changedFields } : {}), ...(properties ? { properties } : {}) };
  return {
    id: "trg_1",
    action,
    timestamp: "2026-11-19T00:00:00.000Z",
    urn: `urn:1:co_channel:cohost-falcon:${resourcePath}`,
    context: { companyId: "co_channel", service: "cohost-falcon", resourcePath },
    ...(Object.keys(data).length ? { data } : {}),
  };
}

const ingest = (body: unknown, params: Record<string, unknown>, ctx = mockCtx().ctx) =>
  channelEventChanged.handleIngest({ raw: { body }, params, state: STATE, subscriptionId: "sub_1" }, ctx);

test("the app registers channel-event-changed", () => {
  expect(app.triggers.map((t) => t.key)).toContain("channel-event-changed");
});

test("subscribes to every channelEvent.* action by default, or the picked ones", async () => {
  const subscribe = async (params: Record<string, unknown>) => {
    const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_1" } }]);
    expect(await channelEventChanged.onSubscribe!({ params, ...SUB }, ctx)).toEqual(STATE);
    expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
    return JSON.parse(calls[0].body!).events;
  };
  expect(await subscribe({})).toEqual(["channelEvent.listed", "channelEvent.changed", "channelEvent.unlisted"]);
  expect(await subscribe({ actions: ["changed"] })).toEqual(["channelEvent.changed"]);
  await expect(channelEventChanged.onSubscribe!({ params: { actions: ["updated"] }, ...SUB }, mockCtx().ctx))
    .rejects.toThrow(/actions: Unknown/);
});

test("fetches the listing as the channel shows it — channel header, listing id", async () => {
  const shown = { id: "ev_1", name: "Fest on Channel", ticketPrices: ["USD,2500"] };
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: shown } }]);

  const [out] = await ingest(ping("channelEvent.changed", LISTING, ["tickets.tk_1.costs"]), {}, ctx);

  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/events/ev_1");
  expect(url.searchParams.get("listingId")).toBe("primary");
  expect(calls[0].headers["x-cohost-channel-id"]).toBe("ch_1");
  expect(out).toEqual({
    urn: `urn:1:co_channel:cohost-falcon:${LISTING}`,
    action: "channelEvent.changed",
    type: "channelEvent",
    id: "ev_1",
    timestamp: "2026-11-19T00:00:00.000Z",
    data: shown,
    meta: {
      changedFields: ["tickets.tk_1.costs"],
      companyId: "co_channel",
      eventId: "ev_1",
      resourcePath: LISTING,
      deliveryId: "trg_1",
      channelId: "ch_1",
      listingId: "primary",
      properties: {},
    },
  });
});

test("carries the listing's properties — the id a previous run synced it to", async () => {
  const { ctx } = mockCtx([{ body: { id: "ev_1" } }]);
  const [out] = await ingest(ping("channelEvent.changed", LISTING, ["event.name"], { eventbriteId: "eb_1" }), {}, ctx);
  expect(out.meta.properties).toEqual({ eventbriteId: "eb_1" });

  // Still there once unlisted, so the run can take the synced copy down.
  const [gone] = await ingest(ping("channelEvent.unlisted", LISTING, undefined, { eventbriteId: "eb_1" }), {});
  expect(gone).toMatchObject({ data: null, meta: { properties: { eventbriteId: "eb_1" } } });
});

test("an unlisted listing is not fetched", async () => {
  const { ctx, calls } = mockCtx();
  const [out] = await ingest(ping("channelEvent.unlisted"), {}, ctx);
  expect(calls).toHaveLength(0);
  expect(out).toMatchObject({ action: "channelEvent.unlisted", data: null, meta: { channelId: "ch_1", listingId: "primary" } });
});

test("a listing the channel stopped showing before the fetch comes through with no data", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: { message: "not found" } }]);
  const [out] = await ingest(ping("channelEvent.changed"), {}, ctx);
  expect(out).toMatchObject({ action: "channelEvent.changed", data: null });
});

test("any other fetch failure fails the run", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Server Error", body: "boom" }]);
  await expect(ingest(ping("channelEvent.changed"), {}, ctx)).rejects.toThrow(/Cohost 500/);
});

test("the channel filter drops other channels' listings without fetching", async () => {
  const { ctx, calls } = mockCtx();
  expect(await ingest(ping("channelEvent.changed"), { channelId: "ch_other" }, ctx)).toEqual([]);
  expect(calls).toHaveLength(0);
});

test("an extra listing is fetched by its own listing id", async () => {
  const path = "/channels/ch_1/events/ev_1/listings/lst_vip";
  const { ctx, calls } = mockCtx([{ body: { id: "ev_1", listingId: "lst_vip" } }]);
  const [out] = await ingest(ping("channelEvent.listed", path), { channelId: "ch_1" }, ctx);
  expect(new URL(calls[0].url).searchParams.get("listingId")).toBe("lst_vip");
  expect(out.meta).toMatchObject({ channelId: "ch_1", listingId: "lst_vip" });
});

test("parseListingPath reads only listing paths", () => {
  expect(parseListingPath(LISTING)).toEqual({ channelId: "ch_1", eventId: "ev_1", listingId: "primary" });
  expect(parseListingPath("/events/ev_1")).toBeNull();
  expect(parseListingPath("/channels/ch_1/events/ev_1")).toBeNull();
  expect(parseListingPath(`${LISTING}/extra`)).toBeNull();
});

test("the sample matches the declared payload shape", () => {
  const sample = channelEventChanged.sample as { type: string; meta: Record<string, unknown> };
  expect(sample.type).toBe("channelEvent");
  expect(sample.meta).toMatchObject({ channelId: "ch_sample", listingId: "primary", properties: expect.any(Object) });
});
