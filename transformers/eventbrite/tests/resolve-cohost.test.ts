import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { expect, test } from "vitest";
import { cohostToEventbrite } from "../lib/resolve-cohost.ts";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { Converted } from "../lib/resolve.ts";
import type { EbEventInput, EbOrder, EbTicketClassInput } from "../lib/types.ts";
import { createEventbriteFixture } from "./artficats/ebrite_event.ts";
import { createEventbriteOrdersFixture } from "./artficats/ebrite_orders.ts";

const context = createEventbriteContextFixture();

test("detects native Cohost shapes without IDs or a source marker", () => {
  expect(cohostToEventbrite({
    name: "Workshop", summary: "Learn together", tz: "UTC", currency: "EUR", status: "live",
    start: "2030-06-01T10:00:00Z", end: "2030-06-01T12:00:00Z",
  })).toEqual({
    name: "Workshop", summary: "Learn together", currency: "EUR",
    timezone: "UTC", startUtc: "2030-06-01T10:00:00Z", endUtc: "2030-06-01T12:00:00Z",
  });
  expect(cohostToEventbrite({ name: "Admission", price: "EUR,1500", priceCategory: "paid" })).toEqual({
    name: "Admission", cost: "EUR,1500", hidden: false,
  });
  expect(cohostToEventbrite({
    orderNumber: "example-order", customer: { name: "Example Buyer" }, status: "placed", currency: "EUR",
    costs: { subtotal: "EUR,1500", fee: "EUR,100", tax: "EUR,50", total: "EUR,1650" },
    items: [{ offeringId: "example-ticket", quantity: 2, costs: { cost: "EUR,1500", fee: "EUR,100", tax: "EUR,50", gross: "EUR,1600" } }],
  })).toMatchObject({
    id: "example-order", name: "Example Buyer", currency: "EUR",
    costs: { gross: { value: 1650 }, eventbrite_fee: { value: 100 }, payment_fee: { value: 0 } },
    attendees: [{ ticket_class_id: "example-ticket", quantity: 2, costs: { base_price: { value: 1500 } } }],
  });
});

test("expanded events convert nested tickets to ticketClasses inputs without mutation", () => {
  const source = createEventbriteFixture({ type: "expanded_event" });
  const converted = eventbriteToCohost(source, context) as Converted<"event">;
  const event = converted.data;
  const original = structuredClone(event);
  const result = cohostToEventbrite(event) as EbEventInput;
  expect(result.eventId).toBe(source.id);
  expect(result.startUtc).toBe(source.start.utc);
  expect(result).not.toHaveProperty("tickets");
  expect(result.ticketClasses).toHaveLength(9);
  expect(result.ticketClasses?.map(ticket => ticket.ticketClassId)).toEqual(source.ticket_classes.map(ticket => ticket.id));
  expect(result.ticketClasses?.map(ticket => ticket.eventId)).toEqual(source.ticket_classes.map(() => source.id));
  expect(result.ticketClasses?.map(ticket => ticket.cost ?? null)).toEqual(
    source.ticket_classes.map(ticket => (ticket.free ? null : `${ticket.cost.currency},${ticket.cost.value}`)),
  );
  expect(event).toEqual(original);
  expect(cohostToEventbrite(converted)).toEqual(result);
});

test("missing, null, and empty ticket expansions retain their meaning", () => {
  const event = { name: "Workshop", tz: "UTC", currency: "USD" };
  expect(cohostToEventbrite(event)).not.toHaveProperty("ticketClasses");
  expect(cohostToEventbrite({ ...event, tickets: null })).not.toHaveProperty("ticketClasses");
  expect(cohostToEventbrite({ ...event, tickets: [] })).toHaveProperty("ticketClasses", []);
});

test("free tickets and event fallback currency are supported", () => {
  expect(cohostToEventbrite({ name: "RSVP", priceCategory: "free" })).toEqual({ name: "RSVP", free: true, hidden: false });
  expect(cohostToEventbrite({ name: "Workshop", tz: "UTC" }, "eur")).toHaveProperty("currency", "EUR");
  expect(cohostToEventbrite({ name: "GA", price: "GBP,1200" }, "EUR")).toHaveProperty("cost", "GBP,1200");
});

test("orders convert items to attendees while preserving quantities and mapped totals", () => {
  const order = (eventbriteToCohost(createEventbriteOrdersFixture({ type: "expanded_order", orderIndex: 4 }), context) as Converted<"order">).data;
  const original = structuredClone(order);
  const result = cohostToEventbrite(order) as EbOrder;
  expect(result.id).toBe(order.sourceId);
  expect(result.email).toBe(order.customer.email);
  expect(result.attendees).toHaveLength(4);
  expect(result.attendees?.[0]).toMatchObject({ id: order.items[0].id, ticket_class_id: order.items[0].offeringId, quantity: 1 });
  expect(result.costs?.gross?.value).toBe(Number(order.costs.total.split(",")[1]));
  expect(result.costs?.payment_fee?.value).toBe(0);
  expect(order).toEqual(original);
});

test("named listings round-trip every event, ticket, and order", () => {
  const events = createEventbriteFixture();
  const eventResult = cohostToEventbrite(eventbriteToCohost(events, context)) as { events: EbEventInput[]; pagination: unknown };
  expect(eventResult.events[0].ticketClasses).toHaveLength(9);
  expect(eventResult.pagination).toEqual(events.pagination);

  const tickets = createEventbriteFixture({ type: "ticket_class_listing" });
  const ticketResult = cohostToEventbrite(eventbriteToCohost(tickets, context)) as { ticketClasses: EbTicketClassInput[]; pagination: unknown };
  expect(ticketResult.ticketClasses.map(ticket => ticket.ticketClassId)).toEqual(tickets.ticket_classes.map(ticket => ticket.id));
  expect(ticketResult.pagination).toEqual(tickets.pagination);

  const orders = createEventbriteOrdersFixture();
  const orderResult = cohostToEventbrite(eventbriteToCohost(orders, context)) as { orders: EbOrder[]; pagination: unknown };
  expect(orderResult.orders.map(order => order.id)).toEqual(orders.orders.map(order => order.id));
  expect(orderResult.pagination).toEqual(orders.pagination);
});

test("Cohost results envelopes and mixed arrays preserve order and pagination", () => {
  const items = [
    { name: "Event", tz: "UTC", currency: "USD" },
    { name: "Ticket", price: "USD,1000" },
  ];
  const input = { results: items, pagination: { page: 1, size: 50, total: 2, continuation: null } };
  const result = cohostToEventbrite(input) as { results: unknown[]; pagination: typeof input.pagination };
  expect(result.results).toEqual(cohostToEventbrite(items));
  expect(result.results[0]).toMatchObject({ name: "Event" });
  expect(result.results[1]).toMatchObject({ cost: "USD,1000" });
  expect(result.pagination).toEqual(input.pagination);
  result.pagination.total = 99;
  expect(input.pagination.total).toBe(2);
  expect(cohostToEventbrite({ results: [] })).toEqual({ results: [] });
  expect(cohostToEventbrite({ events: [] })).toEqual({ events: [] });
  expect(cohostToEventbrite({ tickets: [] })).toEqual({ ticketClasses: [] });
  expect(cohostToEventbrite({ orders: [] })).toEqual({ orders: [] });
  expect(cohostToEventbrite([])).toEqual([]);
});

test.each([null, undefined, 42, "event", {}, { id: "123", name: "Unknown" }])(
  "rejects unknown Cohost input: %j", input => {
    expect(() => cohostToEventbrite(input)).toThrow(/data:/);
  },
);

test("rejects ambiguous objects, standalone attendees, and standalone items", () => {
  expect(() => cohostToEventbrite({ tz: "UTC", price: "USD,10" })).toThrow(/Ambiguous/);
  expect(() => cohostToEventbrite({ events: [], tickets: [] })).toThrow(/Ambiguous/);
  expect(() => cohostToEventbrite({ results: [], orders: [] })).toThrow(/Ambiguous/);
  expect(() => cohostToEventbrite({ orderNumber: "order", profile: {} })).toThrow(/parent order/);
  expect(() => cohostToEventbrite({ offeringId: "ticket", costs: {} })).toThrow(/parent order/);
});

test("rejects malformed collections and incomplete orders with paths", () => {
  expect(() => cohostToEventbrite({ events: [{ price: "USD,10" }] })).toThrow(/Expected a Cohost event, received ticket/);
  expect(() => cohostToEventbrite({ tz: "UTC", tickets: [{}] })).toThrow(/data\.tickets\[0\]/);
  expect(() => cohostToEventbrite({ tz: "UTC", tickets: {} })).toThrow(/tickets: Expected an array/);
  expect(() => cohostToEventbrite({ results: [null] })).toThrow(/data\.results\[0\]/);
  expect(() => cohostToEventbrite({ results: {} })).toThrow(/results: Expected an array/);
  expect(() => cohostToEventbrite({ results: [], pagination: "bad" })).toThrow(/pagination/);
  expect(() => cohostToEventbrite({ tz: "UTC", currency: 42 })).toThrow(/data\.currency/);
  expect(() => cohostToEventbrite({ orderNumber: "order" })).toThrow(/data\.customer/);
  expect(() => cohostToEventbrite({ customer: {}, costs: {} })).toThrow(/data\.items/);
  expect(() => cohostToEventbrite({ customer: {}, costs: {}, items: [null] })).toThrow(/data\.items\[0\]/);
});
