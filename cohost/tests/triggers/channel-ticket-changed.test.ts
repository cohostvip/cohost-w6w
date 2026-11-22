import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import channelTicketChanged from "../../triggers/channel-ticket-changed.ts";

const SUB = { subscriptionId: "sub_1", callbackUrl: "https://w6w.example/hooks/sub_1", hostUrl: "https://w6w.example" };
const STATE = { webhookId: "wh_1" };
const PATH = "/events/ev_1/tickets/tk_1";

function ping(action = "offering.updated", resourcePath = PATH) {
  return {
    id: "trg_1",
    action,
    timestamp: "2026-11-19T00:00:00.000Z",
    urn: `urn:1:co_1:cohost-falcon:${resourcePath}`,
    context: { companyId: "co_1", service: "cohost-falcon", resourcePath },
    data: { changedFields: ["costs"] },
  };
}

const ingest = (body: unknown, params: Record<string, unknown>, ctx = mockCtx().ctx) =>
  channelTicketChanged.handleIngest({ raw: { body }, params, state: STATE, subscriptionId: "sub_1" }, ctx);

const LISTED = { body: [{ listingId: "primary" }] };
const TICKET = { body: { id: "tk_1", name: "GA" } };

test("a ticket of a listed event yields one payload with data and meta", async () => {
  const { ctx, calls } = mockCtx([LISTED, TICKET]);
  const out = await ingest(ping(), { channelId: "ch_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/company/sales-channels/ch_1/events/ev_1/listings");
  expect(new URL(calls[1].url).pathname).toBe("/v1/events/ev_1/tickets/tk_1");
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({
    action: "offering.updated",
    type: "offering",
    id: "tk_1",
    data: { id: "tk_1", name: "GA" },
    meta: { channelId: "ch_1", eventId: "ev_1", ticketId: "tk_1", companyId: "co_1", deliveryId: "trg_1" },
  });
});

test("deleted ticket of a listed event: data null, no ticket fetch", async () => {
  const { ctx, calls } = mockCtx([LISTED]);
  const out = await ingest(ping("offering.deleted"), { channelId: "ch_1" }, ctx);
  expect(calls).toHaveLength(1);
  expect(out[0]).toMatchObject({ data: null, meta: { ticketId: "tk_1" } });
});

test("unlisted event (empty rows or 404) yields nothing and fetches no ticket", async () => {
  const empty = mockCtx([{ body: [] }]);
  expect(await ingest(ping(), { channelId: "ch_1" }, empty.ctx)).toEqual([]);
  expect(empty.calls).toHaveLength(1);
  const missing = mockCtx([{ status: 404, body: { error: "nope" } }]);
  expect(await ingest(ping(), { channelId: "ch_1" }, missing.ctx)).toEqual([]);
  expect(missing.calls).toHaveLength(1);
});

test("a lookup error other than not-found throws", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "boom" } }]);
  await expect(ingest(ping(), { channelId: "ch_1" }, ctx)).rejects.toThrow(/500/);
});

test("unparseable or missing eventId yields nothing without any request", async () => {
  for (const path of ["/orders/or_1", "/events", "", "/events/%E0%A4%A/tickets/tk_1"]) {
    const { ctx, calls } = mockCtx();
    expect(await ingest(ping("offering.updated", path), { channelId: "ch_1" }, ctx)).toEqual([]);
    expect(calls).toHaveLength(0);
  }
});

test("the membership cache does not outlive the call", async () => {
  const { ctx, calls } = mockCtx([LISTED, TICKET, LISTED, TICKET]);
  await ingest(ping(), { channelId: "ch_1" }, ctx);
  await ingest(ping(), { channelId: "ch_1" }, ctx);
  expect(calls.filter((c) => c.url.includes("/listings"))).toHaveLength(2);
});

test("channelId is required at subscribe and at ingest", async () => {
  await expect(channelTicketChanged.onSubscribe!({ params: {}, ...SUB }, mockCtx().ctx)).rejects.toThrow(/channelId/);
  await expect(channelTicketChanged.onSubscribe!({ params: { channelId: " " }, ...SUB }, mockCtx().ctx))
    .rejects.toThrow(/channelId/);
  await expect(ingest(ping(), {})).rejects.toThrow(/channelId/);
  expect(channelTicketChanged.params?.find((p) => p.key === "channelId")?.required).toBe(true);
});

test("subscribes to the chosen offering.* actions only; unsubscribes like ticket-changed", async () => {
  const subscribe = async (params: Record<string, unknown>) => {
    const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_1" } }]);
    expect(await channelTicketChanged.onSubscribe!({ params: { channelId: "ch_1", ...params }, ...SUB }, ctx)).toEqual(STATE);
    expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
    return JSON.parse(calls[0].body!).events;
  };
  expect(await subscribe({})).toEqual(["offering.created", "offering.updated", "offering.deleted"]);
  expect(await subscribe({ actions: ["deleted"] })).toEqual(["offering.deleted"]);

  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await channelTicketChanged.onUnsubscribe!({ state: STATE, params: { channelId: "ch_1" }, subscriptionId: "sub_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks/wh_1");
});
