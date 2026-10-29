import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { expect, test } from "vitest";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { CohostEvent, CohostOrder, CohostTicket } from "../lib/types.ts";
import { createEventbriteFixture } from "./artficats/ebrite_event.ts";
import { createEventbriteOrdersFixture } from "./artficats/ebrite_orders.ts";

const context = createEventbriteContextFixture();

test("detects shapes independently of resource URLs and ID naming conventions", () => {
  expect(eventbriteToCohost({ id: "123", name: { text: "Festival" } }, context)).toMatchObject({ name: "Festival", tz: "UTC" });
  expect(eventbriteToCohost({ id: "123", event_id: "event-1", name: "Free entry", free: true }, context, "EUR")).toMatchObject({ price: "EUR,0" });
  expect(eventbriteToCohost({ id: "123", email: "buyer@example.com", status: "placed" }, context)).toMatchObject({
    customer: { email: "buyer@example.com" }, items: [],
  });
});

test("expanded event maps all ticket classes without mutating the input", () => {
  const input = createEventbriteFixture({ type: "expanded_event" });
  const original = structuredClone(input);
  const result = eventbriteToCohost(input, context) as CohostEvent;
  expect(result.name).toBe("Example Community Festival");
  expect(result.sourceId).toBe(input.id);
  expect(result).not.toHaveProperty("ticket_classes");
  expect(result.tickets).toHaveLength(9);
  expect(result.tickets?.map(ticket => ticket.sourceId)).toEqual(input.ticket_classes.map(ticket => ticket.id));
  expect(result.tickets?.[0]).toMatchObject({ type: "admission", price: "USD,2500", quantity: 50 });
  expect(input).toEqual(original);
});

test("nested free tickets use event currency; explicit ticket currency wins", () => {
  const result = eventbriteToCohost({
    id: "event-1", name: { text: "Festival" }, currency: "eur",
    ticket_classes: [
      { id: "ticket-1", name: "RSVP", free: true },
      { id: "ticket-2", name: "Paid", cost: { currency: "GBP", value: 1500 } },
    ],
  }, context, "CAD") as CohostEvent;
  expect(result.tickets?.map(ticket => ticket.price)).toEqual(["EUR,0", "GBP,1500"]);
});

test("absent and null expansions stay absent, while empty expansions stay empty", () => {
  const event = createEventbriteFixture({ type: "event" });
  expect(eventbriteToCohost(event, context)).not.toHaveProperty("tickets");
  expect(eventbriteToCohost({ ...event, ticket_classes: null }, context)).not.toHaveProperty("tickets");
  expect(eventbriteToCohost({ ...event, ticket_classes: [] }, context)).toHaveProperty("tickets", []);
});

test("expanded order aggregates multiple attendees into Cohost line items", () => {
  const input = createEventbriteOrdersFixture({ type: "expanded_order", orderIndex: 4 });
  const original = structuredClone(input);
  const result = eventbriteToCohost(input, context) as CohostOrder;
  expect(result.orderNumber).toBe(input.id);
  expect(result.customer.email).toBe(input.email);
  expect(result.items).toHaveLength(1);
  expect(result.items[0].quantity).toBe(4);
  expect(result.items[0].offeringId).toBe(input.attendees[0].ticket_class_id);
  expect(result.items[0].costs.cost).toBe(`USD,${input.costs.base_price.value}`);
  expect(result).not.toHaveProperty("attendees");
  expect(input).toEqual(original);
  expect(eventbriteToCohost(createEventbriteOrdersFixture({ type: "order" }), context)).toHaveProperty("items", []);
});

test("event listings map expanded children and preserve pagination independently", () => {
  const input = createEventbriteFixture();
  const result = eventbriteToCohost(input, context) as { events: CohostEvent[]; pagination: typeof input.pagination };
  expect(result.events).toHaveLength(1);
  expect(result.events[0].tickets).toHaveLength(9);
  expect(result.pagination).toEqual(input.pagination);
  result.pagination.object_count = 99;
  expect(input.pagination.object_count).toBe(1);
});

test("ticket and order listings map every object", () => {
  const tickets = createEventbriteFixture({ type: "ticket_class_listing" });
  const ticketResult = eventbriteToCohost(tickets, context) as { tickets: CohostTicket[]; pagination: unknown };
  expect(ticketResult.tickets.map(ticket => ticket.sourceId)).toEqual(tickets.ticket_classes.map(ticket => ticket.id));
  expect(ticketResult.pagination).toEqual(tickets.pagination);
  expect(ticketResult).not.toHaveProperty("ticket_classes");

  const orders = createEventbriteOrdersFixture();
  const orderResult = eventbriteToCohost(orders, context) as { orders: CohostOrder[]; pagination: unknown };
  expect(orderResult.orders.map(order => order.sourceId)).toEqual(orders.orders.map(order => order.id));
  expect(orderResult.orders[4].items[0].quantity).toBe(4);
  expect(orderResult.pagination).toEqual(orders.pagination);
});

test("arrays can mix recognized object families and can be empty", () => {
  const result = eventbriteToCohost([
    createEventbriteFixture({ type: "event" }),
    createEventbriteFixture({ type: "ticket_class" }),
    createEventbriteOrdersFixture({ type: "order" }),
  ], context);
  expect(result).toEqual([
    expect.objectContaining({ name: "Example Community Festival", tz: "America/New_York" }),
    expect.objectContaining({ price: "USD,2500" }),
    expect.objectContaining({ orderNumber: "6000000000001" }),
  ]);
  expect(eventbriteToCohost([], context)).toEqual([]);
  expect(eventbriteToCohost({ events: [] }, context)).toEqual({ events: [] });
  expect(eventbriteToCohost({ ticket_classes: [] }, context)).toEqual({ tickets: [] });
  expect(eventbriteToCohost({ orders: [] }, context)).toEqual({ orders: [] });
});

test.each([null, undefined, 42, "event", {}, { id: "123", name: "Unknown" }])(
  "rejects unrecognized input: %j", input => {
    expect(() => eventbriteToCohost(input, context)).toThrow(/data:/);
  },
);

test("rejects ambiguous shapes and standalone attendees", () => {
  expect(() => eventbriteToCohost({ start: {}, cost: null }, context)).toThrow(/Ambiguous/);
  expect(() => eventbriteToCohost({ events: [], orders: [] }, context)).toThrow(/Ambiguous/);
  expect(() => eventbriteToCohost(createEventbriteOrdersFixture({ type: "attendee" }), context)).toThrow(/parent order/);
  expect(() => eventbriteToCohost(createEventbriteOrdersFixture({ type: "attendee_listing" }), context)).toThrow(/Unrecognized/);
});

test("reports the path of invalid nested objects and mismatched listing items", () => {
  expect(() => eventbriteToCohost({ events: [null] }, context)).toThrow(/data\.events\[0\]/);
  expect(() => eventbriteToCohost({ events: [{ free: true }] }, context)).toThrow(/Expected an Eventbrite event, received ticket/);
  expect(() => eventbriteToCohost({ name: { text: "Event" }, ticket_classes: [{}] }, context)).toThrow(/data\.ticket_classes\[0\]/);
  expect(() => eventbriteToCohost({ name: { text: "Event" }, ticket_classes: {} }, context)).toThrow(/ticket_classes: Expected an array/);
  expect(() => eventbriteToCohost({ id: "order", attendees: [null] }, context)).toThrow(/data\.attendees\[0\]/);
  expect(() => eventbriteToCohost({ id: "order", attendees: {} }, context)).toThrow(/attendees: Expected an array/);
  expect(() => eventbriteToCohost({ orders: {} }, context)).toThrow(/orders: Expected an array/);
  expect(() => eventbriteToCohost({ orders: [], pagination: "invalid" }, context)).toThrow(/pagination/);
});
