import { expect, test } from "vitest";
import { generateUrn } from "../../../shared/urn.ts";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { CohostEvent, CohostOrder, CohostTicket } from "../lib/types.ts";
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

test("URN identity survives repeated conversions and changes to app metadata", () => {
  const event = createEventbriteFixture({ type: "event" });
  const first = eventbriteToCohost(event, context) as CohostEvent;
  expect(eventbriteToCohost(event, context)).toEqual(first);
  expect(eventbriteToCohost(event, { ...context, app: "io.w6w.example", action: "list-events", version: "0.5.0" })).toEqual(first);
});

test("every mapped event, nested ticket, and order receives its source URN", () => {
  const input = createEventbriteFixture({ type: "expanded_event" });
  const original = structuredClone(input);
  const event = eventbriteToCohost(input, context) as CohostEvent;
  expect(event.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/${input.id}`);
  for (const [index, ticket] of event.tickets!.entries()) {
    expect(ticket.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/${input.id}/ticket_classes/${input.ticket_classes[index].id}`);
  }
  const orderInput = createEventbriteOrdersFixture({ type: "expanded_order" });
  const order = eventbriteToCohost(orderInput, context) as CohostOrder;
  expect(order.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/orders/${orderInput.id}`);
  expect(input).toEqual(original);
});

test("standalone, nested, and listed tickets use the same URN", () => {
  const eventInput = createEventbriteFixture({ type: "expanded_event" });
  const standalone = eventbriteToCohost(eventInput.ticket_classes[0], context) as CohostTicket;
  const nested = eventbriteToCohost(eventInput, context) as CohostEvent;
  const listed = eventbriteToCohost(createEventbriteFixture({ type: "ticket_class_listing" }), context) as { tickets: CohostTicket[] };
  expect(nested.tickets?.[0].urn).toBe(standalone.urn);
  expect(listed.tickets[0].urn).toBe(standalone.urn);

  const { event_id, ...ticketWithoutParent } = eventInput.ticket_classes[0];
  const withInferredParent = eventbriteToCohost({ ...eventInput, ticket_classes: [ticketWithoutParent] }, context) as CohostEvent;
  expect(withInferredParent.tickets?.[0].urn).toBe(standalone.urn);
  expect(() => eventbriteToCohost(ticketWithoutParent, context)).toThrow(/data\.event_id/);
  expect(() => eventbriteToCohost({
    ...eventInput, ticket_classes: [{ ...eventInput.ticket_classes[0], event_id: "other-event" }],
  }, context)).toThrow(/does not match its parent/);
});

test("all records in arrays and listings have URNs; envelopes do not", () => {
  const events = eventbriteToCohost(createEventbriteFixture(), context) as { events: CohostEvent[] };
  const orders = eventbriteToCohost(createEventbriteOrdersFixture(), context) as { orders: CohostOrder[] };
  expect(events).not.toHaveProperty("urn");
  expect(orders).not.toHaveProperty("urn");
  for (const object of [...events.events, ...orders.orders]) expect(object.urn).toMatch(/^urn:1:/);
  const array = eventbriteToCohost([
    createEventbriteFixture({ type: "event" }),
    createEventbriteOrdersFixture({ type: "order" }),
  ], context) as (CohostEvent | CohostOrder)[];
  expect(array.map(object => object.urn)).toEqual([events.events[0].urn, orders.orders[0].urn]);
});

test("IDs containing reserved characters are encoded as one path segment", () => {
  const event = eventbriteToCohost({ id: "example/a:b?c#d%", name: { text: "Event" } }, context) as CohostEvent;
  expect(event.urn).toBe(`urn:1:${context.companyId}:${context.connectionId}:/events/example%2Fa%3Ab%3Fc%23d%25`);
  expect(() => eventbriteToCohost({ name: { text: "Event" } }, context)).toThrow(/data\.id.*source ID/);
  expect(() => eventbriteToCohost({ id: "..", name: { text: "Event" } }, context)).toThrow(/source ID/);
});

test("missing context and invalid namespace fields fail even for empty listings", () => {
  expect(() => eventbriteToCohost([], undefined as never)).toThrow(/context:/);
  for (const key of ["companyId", "app", "version", "action", "connectionId"] as const) {
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

test("context fixture returns fresh synthetic invocation metadata", () => {
  const first = createEventbriteContextFixture();
  expect(first).toMatchObject({ companyId: "company_test_eventbrite", app: "io.w6w.eventbrite", version: "0.4.2", action: "get-event" });
  expect(first.connectionId).toMatch(/^conn_test_/);
  first.action = "changed";
  expect(createEventbriteContextFixture().action).toBe("get-event");
  expect(createEventbriteContextFixture({ action: "list-orders" }).action).toBe("list-orders");
});
