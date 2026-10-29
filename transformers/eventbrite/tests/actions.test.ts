import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { expect, test } from "vitest";
import ebToCohost from "../actions/eventbrite-to-cohost.ts";
import cohostToEb from "../actions/cohost-to-eventbrite.ts";
import app from "../index.ts";
import type { CohostEvent } from "../lib/types.ts";

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
  const out = (await ebToCohost.execute(
    { context, data: { id: "event-1", name: { text: "Demo" }, start: { timezone: "UTC", utc: "2026-01-01T00:00:00Z" }, end: {}, status: "live" } },
    ctx,
  )) as CohostEvent;
  expect(out.name).toBe("Demo");
  expect(out.status).toBe("live");
  expect(out.source).toBe("eventbrite");
  expect(out.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/event-1`);
});

test("eventbrite-to-cohost: detects a ticket and honors fallback currency", async () => {
  const out = await ebToCohost.execute({ context, data: { id: "ticket-1", event_id: "event-1", name: "Free", free: true }, currency: "EUR" }, ctx);
  expect((out as { price: string }).price).toBe("EUR,0");
});

test("eventbrite-to-cohost: detects an order", async () => {
  const out = await ebToCohost.execute(
    { context, data: { id: "o1", status: "placed", currency: "USD", costs: { base_price: { currency: "USD", value: 100 } } } },
    ctx,
  );
  expect((out as { orderNumber: string }).orderNumber).toBe("o1");
});

test("app registers only the two directional resolvers", () => {
  expect(app.actions.map(action => action.key)).toEqual([
    "eventbrite-to-cohost",
    "cohost-to-eventbrite",
  ]);
  expect(ebToCohost.params?.find(param => param.key === "data")?.required).toBe(true);
  expect(ebToCohost.params?.find(param => param.key === "context")?.required).toBe(true);
  expect(cohostToEb.params?.find(param => param.key === "data")?.required).toBe(true);
});

test("cohost-to-eventbrite: detects an event", async () => {
  const event = await ebToCohost.execute({ context, data: { id: "event-1", name: { text: "Demo" } } }, ctx) as CohostEvent;
  const out = await cohostToEb.execute({ data: event }, ctx);
  expect(out).toMatchObject({ name: { text: "Demo" } });
});

test("cohost-to-eventbrite: detects tickets and orders", async () => {
  const ticket = await cohostToEb.execute({ data: { name: "GA", price: "EUR,2500", priceCategory: "paid" } }, ctx);
  expect(ticket).toMatchObject({ name: "GA", cost: { currency: "EUR", value: 2500 } });
  const order = await ebToCohost.execute({ context, data: { id: "order-1", costs: {} } }, ctx);
  expect(await cohostToEb.execute({ data: order }, ctx)).toMatchObject({ id: "order-1", attendees: [] });
});
