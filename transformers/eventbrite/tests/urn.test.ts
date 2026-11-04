import { expect, test } from "vitest";
import { generateUrn } from "../../../shared/urn.ts";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { Converted } from "../lib/resolve.ts";
import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { createEventbriteFixture } from "./artficats/ebrite_event.ts";
import { createEventbriteOrdersFixture } from "./artficats/ebrite_orders.ts";

const context = createEventbriteContextFixture();

test("shared URNs distinguish companies, connections, resource kinds, and IDs", () => {
  const urn = generateUrn("/events/123", context);
  expect(urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/123`);
  expect(new Set([
    urn,
    generateUrn("/orders/123", context),
    generateUrn("/events/456", context),
    generateUrn("/events/123", { ...context, companyId: "company_test_other" }),
    generateUrn("/events/123", { ...context, connectionId: "conn_test_other" }),
  ]).size).toBe(5);
});

test("URN identity survives repeated conversions", () => {
  const event = createEventbriteFixture({ type: "event" });
  const first = eventbriteToCohost(event, context);
  expect(eventbriteToCohost(event, context)).toEqual(first);
});

test("every mapped event, nested ticket, and order receives its source URN", () => {
  const input = createEventbriteFixture({ type: "expanded_event" });
  const original = structuredClone(input);
  const result = eventbriteToCohost(input, context) as Converted<"event">;
  const event = result.data, tickets = event.tickets;
  expect(result.urn).toBe(event.urn);
  expect(event.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/${input.id}`);
  for (const [index, ticket] of tickets!.entries()) {
    expect(ticket.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/${input.id}/ticket_classes/${input.ticket_classes[index].id}`);
  }
  const orderInput = createEventbriteOrdersFixture({ type: "expanded_order" });
  const order = (eventbriteToCohost(orderInput, context) as Converted<"order">).data;
  expect(order.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/orders/${orderInput.id}`);
  expect(input).toEqual(original);
});

test("standalone, nested, and listed tickets use the same URN", () => {
  const eventInput = createEventbriteFixture({ type: "expanded_event" });
  const standalone = eventbriteToCohost(eventInput.ticket_classes[0], context) as Converted<"ticket">;
  const nested = (eventbriteToCohost(eventInput, context) as Converted<"event">).data;
  const listed = eventbriteToCohost(createEventbriteFixture({ type: "ticket_class_listing" }), context) as { tickets: Converted<"ticket">[] };
  expect(standalone.data.urn).toBe(standalone.urn);
  expect(nested.tickets?.[0].urn).toBe(standalone.urn);
  expect(listed.tickets[0].urn).toBe(standalone.urn);

  const { event_id, ...ticketWithoutParent } = eventInput.ticket_classes[0];
  const withInferredParent = (eventbriteToCohost({ ...eventInput, ticket_classes: [ticketWithoutParent] }, context) as Converted<"event">).data;
  expect(withInferredParent.tickets?.[0].urn).toBe(standalone.urn);
  expect(() => eventbriteToCohost(ticketWithoutParent, context)).toThrow(/data\.event_id/);
  expect(() => eventbriteToCohost({
    ...eventInput, ticket_classes: [{ ...eventInput.ticket_classes[0], event_id: "other-event" }],
  }, context)).toThrow(/does not match its parent/);
});

test("all records in arrays and listings have URNs; envelopes do not", () => {
  const events = eventbriteToCohost(createEventbriteFixture(), context) as { events: Converted<"event">[] };
  const orders = eventbriteToCohost(createEventbriteOrdersFixture(), context) as { orders: Converted<"order">[] };
  expect(events).not.toHaveProperty("urn");
  expect(orders).not.toHaveProperty("urn");
  for (const object of [...events.events, ...orders.orders]) {
    expect(object.urn).toMatch(/^urn:1:/);
    expect(object.data.urn).toBe(object.urn);
  }
  const array = eventbriteToCohost([
    createEventbriteFixture({ type: "event" }),
    createEventbriteOrdersFixture({ type: "order" }),
  ], context) as [Converted<"event">, Converted<"order">];
  expect([array[0].urn, array[1].urn]).toEqual([events.events[0].urn, orders.orders[0].urn]);
});

test("IDs containing reserved characters are encoded as one path segment", () => {
  const event = eventbriteToCohost({ id: "example/a:b?c#d%", name: { text: "Event" } }, context) as Converted<"event">;
  expect(event.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/example%2Fa%3Ab%3Fc%23d%25`);
  expect(() => eventbriteToCohost({ name: { text: "Event" } }, context)).toThrow(/data\.id.*source ID/);
  expect(() => eventbriteToCohost({ id: "..", name: { text: "Event" } }, context)).toThrow(/source ID/);
});

test("missing context and invalid namespace fields fail even for empty listings", () => {
  expect(() => eventbriteToCohost([], undefined as never)).toThrow(/context:/);
  for (const key of ["companyId", "connectionId"] as const) {
    expect(() => eventbriteToCohost([], { ...context, [key]: "" })).toThrow(`context.${key}`);
  }
  expect(() => generateUrn("/events/1", { ...context, companyId: "company:invalid" })).toThrow(/context.companyId/);
  expect(() => generateUrn("/events/1", { ...context, connectionId: "connection/invalid" })).toThrow(/context.connectionId/);
});

test("missing companyId is rejected without falling back to the source app", () => {
  const { companyId, ...withoutCompany } = context;
  // @ts-expect-error Exercise callers passing incomplete JSON metadata.
  expect(() => eventbriteToCohost(createEventbriteFixture(), withoutCompany)).toThrow(/context.companyId/);
});

test.each(["", "/", "events/123", "/events/", "/events//123", "/events/../123", "/events/123?q=1", "/events/123#part", "/events/a b"])(
  "shared generator rejects noncanonical resource paths: %s", path => {
    expect(() => generateUrn(path, context)).toThrow(/resourcePath:/);
  },
);

test("context fixture returns a fresh synthetic company and connection", () => {
  const first = createEventbriteContextFixture();
  expect(first).toEqual({ companyId: "company_test_eventbrite", connectionId: expect.stringMatching(/^conn_test_/) });
  first.companyId = "changed";
  expect(createEventbriteContextFixture().companyId).toBe("company_test_eventbrite");
  expect(createEventbriteContextFixture({ companyId: "company_test_other" }).companyId).toBe("company_test_other");
});
