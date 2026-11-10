import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import eventChanged from "../../triggers/event-changed.ts";
import ticketChanged from "../../triggers/ticket-changed.ts";
import attendeeChanged from "../../triggers/attendee-changed.ts";
import objectChanged, { webhookEvents } from "../../triggers/object-changed.ts";
import app from "../../index.ts";

const SUB = { subscriptionId: "sub_1", callbackUrl: "https://w6w.example/hooks/sub_1", hostUrl: "https://w6w.example" };

function ping(action: string, resourcePath: string, changedFields?: string[]) {
  return {
    id: "trg_1",
    action,
    timestamp: "2026-11-01T00:00:00.000Z",
    urn: `urn:1:co_1:cohost-falcon:${resourcePath}`,
    context: { companyId: "co_1", service: "cohost-falcon", resourcePath },
    ...(changedFields ? { data: { changedFields } } : {}),
  };
}

async function subscribedEvents(trigger: typeof eventChanged | typeof objectChanged, params: Record<string, unknown>) {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_1" } }]);
  const state = await trigger.onSubscribe!({ params, ...SUB } as never, ctx);
  expect(state).toEqual({ webhookId: "wh_1" });
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
  const body = JSON.parse(calls[0].body!);
  expect(body.url).toBe(SUB.callbackUrl);
  return body.events as string[];
}

test("the app registers the event, ticket and general change triggers", () => {
  expect(app.triggers.map((t) => t.key)).toEqual(
    expect.arrayContaining(["event-changed", "ticket-changed", "attendee-changed", "object-changed"]),
  );
});

test("event-changed: subscribes to the picked event.* actions, created/updated/deleted by default", async () => {
  expect(await subscribedEvents(eventChanged, {})).toEqual(["event.created", "event.updated", "event.deleted"]);
  expect(await subscribedEvents(eventChanged, { actions: ["published"] })).toEqual(["event.published"]);
  await expect(eventChanged.onSubscribe!({ params: { actions: ["changed"] }, ...SUB }, mockCtx().ctx))
    .rejects.toThrow(/actions: Unknown/);
});

test("event-changed: sends the URN, action and type plus the fetched event", async () => {
  const event = { id: "ev_1", name: "Spring Concert" };
  const { ctx, calls } = mockCtx([{ body: event }]);
  const [out] = await eventChanged.handleIngest(
    { raw: { body: ping("event.updated", "/events/ev_1", ["name"]) }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/ev_1");
  expect(out).toEqual({
    urn: "urn:1:co_1:cohost-falcon:/events/ev_1",
    type: "event",
    action: "updated",
    webhookEvent: "event.updated",
    id: "ev_1",
    eventId: "ev_1",
    resourcePath: "/events/ev_1",
    companyId: "co_1",
    changedFields: ["name"],
    timestamp: "2026-11-01T00:00:00.000Z",
    event,
  });
});

test("event-changed: a deleted event is not fetched", async () => {
  const { ctx, calls } = mockCtx();
  const [out] = await eventChanged.handleIngest(
    { raw: { body: ping("event.deleted", "/events/ev_1") }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(calls).toHaveLength(0);
  expect(out).toMatchObject({ action: "deleted", type: "event", id: "ev_1", event: null, changedFields: [] });
});

test("ticket-changed: subscribes to offering.* and fetches the ticket under its event", async () => {
  expect(await subscribedEvents(ticketChanged as never, {})).toEqual([
    "offering.created", "offering.updated", "offering.deleted",
  ]);
  const ticket = { id: "tk_1", name: "GA" };
  const { ctx, calls } = mockCtx([{ body: ticket }]);
  const [out] = await ticketChanged.handleIngest(
    { raw: { body: ping("offering.created", "/events/ev_1/tickets/tk_1") }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/ev_1/tickets/tk_1");
  expect(out).toMatchObject({ type: "offering", action: "created", id: "tk_1", eventId: "ev_1", ticket });
});

test("attendee-changed: subscribes to attendee.created by default, or the picked actions", async () => {
  expect(await subscribedEvents(attendeeChanged as never, {})).toEqual(["attendee.created"]);
  expect(await subscribedEvents(attendeeChanged as never, { actions: ["created", "checked_in", "deleted"] })).toEqual([
    "attendee.created",
    "attendee.checked_in",
    "attendee.deleted",
  ]);
  await expect(
    attendeeChanged.onSubscribe!({ params: { actions: ["updated"] }, ...SUB }, mockCtx().ctx),
  ).rejects.toThrow();
});

test("attendee-changed: fetches each attendee an order creates, under its event", async () => {
  const attendee = { id: "item_1.0", orderId: "ord_1", profile: { email: "a@example.com" } };
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: attendee } }]);
  const [out] = await attendeeChanged.handleIngest(
    { raw: { body: ping("attendee.created", "/events/ev_1/attendees/item_1.0") }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/ev_1/attendees/item_1.0");
  expect(out).toMatchObject({ type: "attendee", action: "created", id: "item_1.0", eventId: "ev_1", attendee });
});

test("attendee-changed: a deleted attendee is not fetched", async () => {
  const { ctx, calls } = mockCtx();
  const [out] = await attendeeChanged.handleIngest(
    { raw: { body: ping("attendee.deleted", "/events/ev_1/attendees/item_1.0") }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(calls).toHaveLength(0);
  expect(out).toMatchObject({ action: "deleted", attendee: null });
});

test("ticket-changed: a deleted ticket is not fetched", async () => {
  const { ctx, calls } = mockCtx();
  const [out] = await ticketChanged.handleIngest(
    { raw: { body: ping("offering.deleted", "/events/ev_1/tickets/tk_1") }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(calls).toHaveLength(0);
  expect(out).toMatchObject({ action: "deleted", ticket: null });
});

test("object-changed: by default subscribes to created/updated/deleted of every type Cohost emits", async () => {
  expect(await subscribedEvents(objectChanged, {})).toEqual([
    "event.created", "event.updated", "event.deleted",
    "offering.created", "offering.updated", "offering.deleted",
    "order.created", "order.updated",
    "attendee.created", "attendee.deleted",
  ]);
});

test("object-changed: only combinations Cohost actually emits are subscribed", () => {
  expect(webhookEvents({ types: ["order", "attendee"], actions: ["placed", "checked_in"] }))
    .toEqual(["order.placed", "attendee.checked_in"]);
  expect(() => webhookEvents({ types: ["attendee"], actions: ["updated"] })).toThrow(/emits none/);
  expect(() => webhookEvents({ types: ["coupon"] })).toThrow(/types: Unknown/);
});

test("object-changed: sends only the URN, action and type — no fetch", async () => {
  const { ctx, calls } = mockCtx();
  const [out] = await objectChanged.handleIngest(
    { raw: { body: ping("attendee.checked_in", "/events/ev_1/attendees/at_1", ["checkedIn"]) }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    ctx,
  );
  expect(calls).toHaveLength(0);
  expect(out).toEqual({
    urn: "urn:1:co_1:cohost-falcon:/events/ev_1/attendees/at_1",
    type: "attendee",
    action: "checked_in",
    webhookEvent: "attendee.checked_in",
    id: "at_1",
    eventId: "ev_1",
    resourcePath: "/events/ev_1/attendees/at_1",
    companyId: "co_1",
    changedFields: ["checkedIn"],
    timestamp: "2026-11-01T00:00:00.000Z",
  });
});

test("object-changed: an order has no parent event id", async () => {
  const [out] = await objectChanged.handleIngest(
    { raw: { body: ping("order.placed", "/orders/ord_1") }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );
  expect(out).toMatchObject({ type: "order", action: "placed", id: "ord_1" });
  expect(out).not.toHaveProperty("eventId");
});

test("change triggers: onUnsubscribe DELETEs the webhook", async () => {
  for (const trigger of [eventChanged, ticketChanged, attendeeChanged, objectChanged]) {
    const { ctx, calls } = mockCtx([{ status: 200 }]);
    await trigger.onUnsubscribe!({ params: {}, state: { webhookId: "wh_9" }, subscriptionId: "sub_1" }, ctx);
    expect(calls[0].method).toBe("DELETE");
    expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks/wh_9");
  }
});
