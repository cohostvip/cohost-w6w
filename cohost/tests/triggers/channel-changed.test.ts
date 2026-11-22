import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import channelChanged from "../../triggers/channel-changed.ts";
import app from "../../index.ts";

const SUB = { subscriptionId: "sub_1", callbackUrl: "https://w6w.example/hooks/sub_1", hostUrl: "https://w6w.example" };
const STATE = { webhookId: "wh_1" };
const TICKET_PATH = "/events/ev_1/tickets/tk_1";
const LISTING = "/channels/ch_1/events/ev_1/listings/primary";

function ping(action: string, resourcePath: string, data?: Record<string, unknown>) {
  return {
    id: "trg_1",
    action,
    timestamp: "2026-11-19T00:00:00.000Z",
    urn: `urn:1:co_1:cohost-falcon:${resourcePath}`,
    context: { companyId: "co_1", service: "cohost-falcon", resourcePath },
    ...(data ? { data } : {}),
  };
}
const ticketPing = (action = "offering.updated", path = TICKET_PATH) => ping(action, path, { changedFields: ["costs"] });

const ingest = (body: unknown, params: Record<string, unknown>, ctx = mockCtx().ctx) =>
  channelChanged.handleIngest({ raw: { body }, params, state: STATE, subscriptionId: "sub_1" }, ctx);

const LISTED = { body: [{ listingId: "primary" }] };
const TICKET = { body: { id: "tk_1", name: "GA" } };

test("the app registers channel-changed; the superseded ticket trigger is gone", () => {
  const keys = app.triggers.map((t) => t.key);
  expect(keys).toContain("channel-changed");
  expect(keys.filter((k) => k.startsWith("channel-"))).toEqual(["channel-event-changed", "channel-changed"]);
});

test("a ticket of a listed event yields one ticket.change payload", async () => {
  const { ctx, calls } = mockCtx([LISTED, TICKET]);
  const out = await ingest(ticketPing(), { channelId: "ch_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/company/sales-channels/ch_1/events/ev_1/listings");
  expect(new URL(calls[1].url).pathname).toBe("/v1/events/ev_1/tickets/tk_1");
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({
    action: "ticket.change",
    type: "offering",
    id: "tk_1",
    data: { id: "tk_1", name: "GA" },
    meta: { channelId: "ch_1", eventId: "ev_1", ticketId: "tk_1", change: "updated", companyId: "co_1", deliveryId: "trg_1" },
  });
});

test("deleted ticket of a listed event: data null, no ticket fetch", async () => {
  const { ctx, calls } = mockCtx([LISTED]);
  const out = await ingest(ticketPing("offering.deleted"), { channelId: "ch_1" }, ctx);
  expect(calls).toHaveLength(1);
  expect(out[0]).toMatchObject({ action: "ticket.change", data: null, meta: { ticketId: "tk_1", change: "deleted" } });
});

test("ticket of an unlisted event (empty rows or 404) yields nothing and fetches no ticket", async () => {
  const empty = mockCtx([{ body: [] }]);
  expect(await ingest(ticketPing(), { channelId: "ch_1" }, empty.ctx)).toEqual([]);
  expect(empty.calls).toHaveLength(1);
  const missing = mockCtx([{ status: 404, body: { error: "nope" } }]);
  expect(await ingest(ticketPing(), { channelId: "ch_1" }, missing.ctx)).toEqual([]);
  expect(missing.calls).toHaveLength(1);
});

test("a lookup error other than not-found throws", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "boom" } }]);
  await expect(ingest(ticketPing(), { channelId: "ch_1" }, ctx)).rejects.toThrow(/500/);
});

test("unparseable ticket path or unknown action yields nothing without any request", async () => {
  for (const p of [ticketPing("offering.updated", "/orders/or_1"), ticketPing("offering.updated", "/events"), ping("order.placed", "/orders/o1")]) {
    const { ctx, calls } = mockCtx();
    expect(await ingest(p, { channelId: "ch_1" }, ctx)).toEqual([]);
    expect(calls).toHaveLength(0);
  }
});

test("event listed/changed/unlisted on the channel -> event.change with meta.change", async () => {
  const shown = { id: "ev_1", name: "Fest on Channel" };
  for (const change of ["listed", "changed", "unlisted"]) {
    const { ctx, calls } = mockCtx([{ body: { status: "ok", data: shown } }]);
    const out = await ingest(ping(`channelEvent.${change}`, LISTING, { properties: { k: "v" } }), { channelId: "ch_1" }, ctx);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      action: "event.change",
      type: "channelEvent",
      id: "ev_1",
      data: change === "unlisted" ? null : shown,
      meta: { channelId: "ch_1", eventId: "ev_1", listingId: "primary", change, properties: { k: "v" }, deliveryId: "trg_1" },
    });
    expect(calls).toHaveLength(change === "unlisted" ? 0 : 1);
    if (calls[0]) expect(calls[0].headers["x-cohost-channel-id"]).toBe("ch_1");
  }
});

test("an event listing on another channel is dropped without any request", async () => {
  const { ctx, calls } = mockCtx();
  expect(await ingest(ping("channelEvent.changed", "/channels/ch_2/events/ev_1/listings/primary"), { channelId: "ch_1" }, ctx)).toEqual([]);
  expect(calls).toHaveLength(0);
});

test("channelId is required at subscribe and at ingest", async () => {
  await expect(channelChanged.onSubscribe!({ params: {}, ...SUB }, mockCtx().ctx)).rejects.toThrow(/channelId/);
  await expect(channelChanged.onSubscribe!({ params: { channelId: " " }, ...SUB }, mockCtx().ctx)).rejects.toThrow(/channelId/);
  await expect(ingest(ticketPing(), {})).rejects.toThrow(/channelId/);
  expect(channelChanged.params?.find((p) => p.key === "channelId")?.required).toBe(true);
});

test("subscribes only to the webhook families the picked actions need; unsubscribes", async () => {
  const subscribe = async (params: Record<string, unknown>) => {
    const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_1" } }]);
    expect(await channelChanged.onSubscribe!({ params: { channelId: "ch_1", ...params }, ...SUB }, ctx)).toEqual(STATE);
    expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
    return JSON.parse(calls[0].body!).events;
  };
  const eventSet = ["channelEvent.listed", "channelEvent.changed", "channelEvent.unlisted"];
  const ticketSet = ["offering.created", "offering.updated", "offering.deleted"];
  expect(await subscribe({})).toEqual([...eventSet, ...ticketSet]);
  expect(await subscribe({ actions: [] })).toEqual([...eventSet, ...ticketSet]);
  expect(await subscribe({ actions: ["event.change"] })).toEqual(eventSet);
  expect(await subscribe({ actions: ["ticket.change"] })).toEqual(ticketSet);

  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await channelChanged.onUnsubscribe!({ state: STATE, params: { channelId: "ch_1" }, subscriptionId: "sub_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks/wh_1");
});
