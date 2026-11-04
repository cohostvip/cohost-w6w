import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { expect, test } from "vitest";
import ebToCohost from "../actions/eventbrite-to-cohost.ts";
import cohostToEb from "../actions/cohost-to-eventbrite.ts";
import app from "../index.ts";
import type { Converted } from "../lib/resolve.ts";

// Actions are pure transforms: no HookContext needed. Pass `undefined as never`.
const ctx = undefined as never;

const context = createEventbriteContextFixture();

test("actions are configured as offline, no-auth, idempotent perform actions", () => {
  for (const a of app.actions) {
    expect(a.type).toBe("perform");
    expect(a.requiresAuth).toBe(false);
    expect(a.idempotent).toBe(true);
  }
});

test("eventbrite-to-cohost: detects an event", async () => {
  const { data: out, urn, type } = (await ebToCohost.execute(
    { ...context, data: { id: "event-1", name: { text: "Demo" }, start: { timezone: "UTC", utc: "2026-01-01T00:00:00Z" }, end: {}, status: "live" } },
    ctx,
  )) as Converted<"event">;
  expect(type).toBe("event");
  expect(urn).toBe(out.urn);
  expect(out.name).toBe("Demo");
  expect(out.status).toBe("live");
  expect(out.source).toBe("eventbrite");
  expect(out.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/event-1`);
});

test("eventbrite-to-cohost: detects a ticket and honors fallback currency", async () => {
  const out = await ebToCohost.execute({ ...context, data: { id: "ticket-1", event_id: "event-1", name: "Free", free: true }, currency: "EUR" }, ctx);
  expect(out).toMatchObject({ type: "ticket", data: { price: "EUR,0" } });
});

test("eventbrite-to-cohost: detects an order", async () => {
  const out = await ebToCohost.execute(
    { ...context, data: { id: "o1", status: "placed", currency: "USD", costs: { base_price: { currency: "USD", value: 100 } } } },
    ctx,
  );
  expect(out).toMatchObject({ type: "order", data: { orderNumber: "o1" } });
});

test("app registers the two directional resolvers and the URN helper", () => {
  expect(app.actions.map(action => action.key)).toEqual([
    "eventbrite-to-cohost",
    "cohost-to-eventbrite",
    "resource-uri-to-urn",
  ]);
  expect(ebToCohost.params?.find(param => param.key === "data")?.required).toBe(true);
  expect(ebToCohost.params?.find(param => param.key === "companyId")?.required).toBe(true);
  expect(ebToCohost.params?.find(param => param.key === "connectionId")?.required).toBe(true);
  expect(ebToCohost.params?.some(param => param.key === "context")).toBe(false);
  expect(cohostToEb.params?.find(param => param.key === "data")?.required).toBe(true);
});

test("eventbrite-to-cohost: still accepts a legacy context object", async () => {
  const { urn } = await ebToCohost.execute({ context, data: { id: "event-1", name: { text: "Demo" } } } as never, ctx) as Converted<"event">;
  expect(urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/event-1`);
});

test("cohost-to-eventbrite: detects an event", async () => {
  const { data: event } = await ebToCohost.execute({ ...context, data: { id: "event-1", name: { text: "Demo" } } }, ctx) as Converted<"event">;
  const out = await cohostToEb.execute({ data: event }, ctx);
  expect(out).toMatchObject({ eventId: "event-1", name: "Demo" });
});

test("cohost-to-eventbrite: detects tickets and orders", async () => {
  const ticket = await cohostToEb.execute({ data: { name: "GA", price: "EUR,2500", priceCategory: "paid" } }, ctx);
  expect(ticket).toEqual({ name: "GA", cost: "EUR,2500", hidden: false });
  const { data: order } = await ebToCohost.execute({ ...context, data: { id: "order-1", costs: {} } }, ctx) as Converted<"order">;
  expect(await cohostToEb.execute({ data: order }, ctx)).toMatchObject({ id: "order-1", attendees: [] });
});
