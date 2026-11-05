import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { expect, test } from "vitest";
import { eventbriteToCohost } from "../lib/resolve.ts";
import { generateUrn } from "../../../shared/urn.ts";
import type { Converted } from "../lib/resolve.ts";
import { createEventbriteFixture } from "./artficats/ebrite_event.ts";
import { createEventbriteOrdersFixture } from "./artficats/ebrite_orders.ts";

const context = createEventbriteContextFixture();

test("detects shapes independently of resource URLs and ID naming conventions", () => {
  expect(eventbriteToCohost({ id: "123", name: { text: "Festival" } }, context)).toMatchObject({ type: "event", data: { name: "Festival", tz: "UTC" } });
  expect(eventbriteToCohost({ id: "123", event_id: "event-1", name: "Free entry", free: true }, context, "EUR")).toMatchObject({ type: "ticket", data: { costs: { cost: "EUR,0" } } });
  expect(eventbriteToCohost({ id: "123", email: "buyer@example.com", status: "placed" }, context)).toMatchObject({
    type: "order", data: { customer: { email: "buyer@example.com" }, items: [] },
  });
});

test("expanded event maps all ticket classes without mutating the input", () => {
  const input = createEventbriteFixture({ type: "expanded_event" });
  const original = structuredClone(input);
  const { data: result } = eventbriteToCohost(input, context) as Converted<"event">;
  const tickets = result.tickets;
  expect(result.name).toBe("Example Community Festival");
  expect(result.sourceId).toBe(input.id);
  expect(result).not.toHaveProperty("ticket_classes");
  expect(tickets).toHaveLength(9);
  expect(tickets?.map(ticket => ticket.refId)).toEqual(input.ticket_classes.map(ticket => ticket.id));
  expect(tickets?.[0]).toMatchObject({ type: "admission", costs: { cost: "USD,2500" }, capacity: 50 });
  expect(input).toEqual(original);
});

test("nested free tickets use event currency; explicit ticket currency wins", () => {
  const { data: { tickets } } = eventbriteToCohost({
    id: "event-1", name: { text: "Festival" }, currency: "eur",
    ticket_classes: [
      { id: "ticket-1", name: "RSVP", free: true },
      { id: "ticket-2", name: "Paid", cost: { currency: "GBP", value: 1500 } },
    ],
  }, context, "CAD") as Converted<"event">;
  expect(tickets?.map(ticket => ticket.costs?.cost)).toEqual(["EUR,0", "GBP,1500"]);
});

test("absent and null expansions stay absent, while empty expansions stay empty", () => {
  const event = createEventbriteFixture({ type: "event" });
  expect(eventbriteToCohost(event, context)).not.toHaveProperty("data.tickets");
  expect(eventbriteToCohost({ ...event, ticket_classes: null }, context)).not.toHaveProperty("data.tickets");
  expect(eventbriteToCohost({ ...event, ticket_classes: [] }, context)).toHaveProperty("data.tickets", []);
});

test("expanded order maps each attendee to its own Cohost line item", () => {
  const input = createEventbriteOrdersFixture({ type: "expanded_order", orderIndex: 4 });
  const original = structuredClone(input);
  const result = (eventbriteToCohost(input, context) as Converted<"order">).data;
  expect(result.orderNumber).toBe(input.id);
  expect(result.customer.email).toBe(input.email);
  expect(result.items.map(item => item.id)).toEqual(input.attendees.map(attendee => attendee.id));
  expect(result.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(4);
  expect(result.items[0].offeringId).toBe(generateUrn(`/events/${input.event_id}/ticket_classes/${input.attendees[0].ticket_class_id}`, context));
  expect(result.items[0].costs.cost).toBe(`USD,${input.attendees[0].costs.base_price.value}`);
  expect(result).not.toHaveProperty("attendees");
  expect(input).toEqual(original);
  expect(eventbriteToCohost(createEventbriteOrdersFixture({ type: "order" }), context)).toHaveProperty("data.items", []);
});

test("event listings map expanded children and preserve pagination independently", () => {
  const input = createEventbriteFixture();
  const result = eventbriteToCohost(input, context) as { events: Converted<"event">[]; pagination: typeof input.pagination };
  expect(result.events).toHaveLength(1);
  expect(result.events[0].data.tickets).toHaveLength(9);
  expect(result.pagination).toEqual(input.pagination);
  result.pagination.object_count = 99;
  expect(input.pagination.object_count).toBe(1);
});

test("ticket and order listings map every object", () => {
  const tickets = createEventbriteFixture({ type: "ticket_class_listing" });
  const ticketResult = eventbriteToCohost(tickets, context) as { tickets: Converted<"ticket">[]; pagination: unknown };
  expect(ticketResult.tickets.map(ticket => ticket.data.refId)).toEqual(tickets.ticket_classes.map(ticket => ticket.id));
  expect(ticketResult.pagination).toEqual(tickets.pagination);
  expect(ticketResult).not.toHaveProperty("ticket_classes");

  const orders = createEventbriteOrdersFixture();
  const orderResult = eventbriteToCohost(orders, context) as { orders: Converted<"order">[]; pagination: unknown };
  expect(orderResult.orders.map(order => order.data.sourceId)).toEqual(orders.orders.map(order => order.id));
  expect(orderResult.orders[4].data.items).toHaveLength(4);
  expect(orderResult.pagination).toEqual(orders.pagination);
});

test("arrays can mix recognized object families and can be empty", () => {
  const result = eventbriteToCohost([
    createEventbriteFixture({ type: "event" }),
    createEventbriteFixture({ type: "ticket_class" }),
    createEventbriteOrdersFixture({ type: "order" }),
  ], context);
  expect(result).toEqual([
    { type: "event", urn: expect.stringMatching(/^urn:1:/), data: expect.objectContaining({ name: "Example Community Festival", tz: "America/New_York" }) },
    { type: "ticket", urn: expect.stringMatching(/^urn:1:/), data: expect.objectContaining({ costs: expect.objectContaining({ cost: "USD,2500" }) }) },
    { type: "order", urn: expect.stringMatching(/^urn:1:/), data: expect.objectContaining({ orderNumber: "6000000000001" }) },
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

test("tickets and orders carry their event as event_urn instead of event_id", () => {
  const eventUrn = (id: string) => generateUrn(`/events/${id}`, context);
  const ticket = eventbriteToCohost({ id: "t1", event_id: "e1", name: "GA", free: true }, context) as Converted<"ticket">;
  expect(ticket.data.event_urn).toBe(eventUrn("e1"));
  expect(ticket.data).not.toHaveProperty("event_id");

  const order = eventbriteToCohost({ id: "o1", event_id: "e1", email: "a@b.co", status: "placed" }, context) as Converted<"order">;
  expect(order.data.event_urn).toBe(eventUrn("e1"));
  expect(order.data).not.toHaveProperty("event_id");
  expect(eventbriteToCohost({ id: "o1", email: "a@b.co", status: "placed" }, context)).not.toHaveProperty("data.event_urn");
  expect(() => eventbriteToCohost({ id: "o1", event_id: "", email: "a@b.co" }, context)).toThrow(/data\.event_id/);

  const event = eventbriteToCohost({ id: "e1", name: { text: "Fest" }, ticket_classes: [{ id: "t1", name: "GA", free: true }] }, context) as Converted<"event">;
  expect(event.data.tickets?.[0].event_urn).toBe(eventUrn("e1"));
});

test("order items reference their ticket's URN when the order names its event", () => {
  const attendees = [{ ticket_class_id: "tc1", quantity: 2 }, { quantity: 1 }];
  const order = eventbriteToCohost({ id: "o1", event_id: "e1", email: "a@b.co", status: "placed", attendees }, context) as Converted<"order">;
  expect(order.data.items.map(item => item.offeringId)).toEqual([generateUrn("/events/e1/ticket_classes/tc1", context), "unknown"]);
  const unscoped = eventbriteToCohost({ id: "o1", email: "a@b.co", status: "placed", attendees }, context) as Converted<"order">;
  expect(unscoped.data.items.map(item => item.offeringId)).toEqual(["tc1", "unknown"]);
});
