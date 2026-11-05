import { expect, test } from "vitest";
import { cohostTicketToEventbrite, eventbriteTicketToCohost } from "../lib/tickets.ts";
import type { EbTicketClass } from "../lib/types.ts";

const paid: EbTicketClass = {
  id: "tc_1",
  name: "General Admission",
  description: "Standing room",
  cost: { currency: "USD", value: 2500 },
  quantity_total: 100,
  quantity_sold: 10,
  hidden: false,
};

test("eventbriteTicketToCohost: paid ticket", () => {
  const t = eventbriteTicketToCohost(paid);
  expect(t.name).toBe("General Admission");
  expect(t.type).toBe("admission");
  expect(t.category).toBe("General Admission");
  expect(t.costs).toEqual({ cost: "USD,2500", fee: "USD,0", tax: "USD,0", delivery: "USD,0", gross: "USD,2500", total: "USD,2500" });
  expect(t.capacity).toBe(100);
  expect(t.status).toBe("live");
  expect(t.priceCategory).toBe("paid");
  expect(t.refId).toBe("tc_1");
  // Cohost tickets take costs/capacity/refId; the write-only aliases are not emitted.
  for (const key of ["price", "quantity", "currency", "sourceId"]) expect(t).not.toHaveProperty(key);
});

test("eventbriteTicketToCohost: Eventbrite's own fee and tax do not become Cohost costs", () => {
  const t = eventbriteTicketToCohost({ ...paid, fee: { currency: "USD", value: 300 }, tax: { currency: "USD", value: 100 } });
  expect(t.costs).toMatchObject({ cost: "USD,2500", fee: "USD,0", tax: "USD,0", total: "USD,2500" });
});

test("eventbriteTicketToCohost: capacity, sales window, sorting and donation", () => {
  const t = eventbriteTicketToCohost({
    ...paid, capacity: 80, donation: true, sorting: 3, sales_start: "2026-10-01T10:00:00Z", sales_end: "2026-10-31T00:00:00Z",
  });
  expect(t).toMatchObject({ capacity: 80, priceCategory: "donation", sorting: 3, salesStart: "2026-10-01T10:00:00Z", salesEnd: "2026-10-31T00:00:00Z" });
  expect(eventbriteTicketToCohost({ id: "tc_3", name: "Open" })).not.toHaveProperty("capacity");
});

test("eventbriteTicketToCohost: free ticket", () => {
  const t = eventbriteTicketToCohost({ id: "tc_2", name: "RSVP", free: true, quantity_total: 50 });
  expect(t.priceCategory).toBe("free");
  expect(t.costs?.cost).toBe("USD,0");
  expect(t.capacity).toBe(50);
});

test("eventbriteTicketToCohost: per-order limits, defaulting to 1 and 10 when Eventbrite leaves them unset", () => {
  expect(eventbriteTicketToCohost(paid)).toMatchObject({ minimumQuantity: 1, maximumQuantity: 10 });
  expect(eventbriteTicketToCohost({ ...paid, minimum_quantity: 2, maximum_quantity: null })).toMatchObject({ minimumQuantity: 2, maximumQuantity: 10 });
  expect(eventbriteTicketToCohost({ ...paid, minimum_quantity: null, maximum_quantity: 4 })).toMatchObject({ minimumQuantity: 1, maximumQuantity: 4 });
});

test("eventbriteTicketToCohost: sold-out and hidden statuses", () => {
  expect(eventbriteTicketToCohost({ ...paid, quantity_sold: 100 }).status).toBe("sold-out");
  expect(eventbriteTicketToCohost({ ...paid, hidden: true }).status).toBe("hidden");
});

test("cohostTicketToEventbrite: an imported paid ticket becomes Update Ticket Class inputs", () => {
  expect(cohostTicketToEventbrite(eventbriteTicketToCohost(paid))).toEqual({
    ticketClassId: "tc_1",
    name: "General Admission",
    description: "Standing room",
    cost: "USD,2500",
    capacity: 100,
    minimumQuantity: 1,
    maximumQuantity: 10,
    hidden: false,
  });
});

test("cohostTicketToEventbrite: exactly one of free, donation or cost", () => {
  const base = { name: "T", category: "event", type: "admission" as const, currency: "USD", price: "usd,0", status: "live" as const, transferable: false };
  expect(cohostTicketToEventbrite({ ...base, priceCategory: "free" })).toEqual({ name: "T", free: true, hidden: false });
  expect(cohostTicketToEventbrite({ ...base, priceCategory: "donation" })).toEqual({ name: "T", donation: true, hidden: false });
  expect(cohostTicketToEventbrite({ ...base, priceCategory: "paid", price: "usd,1500" })).toEqual({ name: "T", cost: "USD,1500", hidden: false });
});

test("cohostTicketToEventbrite: takes the price from costs.cost on tickets the Cohost API returns", () => {
  const input = cohostTicketToEventbrite({
    id: "Jijy9YgcCtKcn6tk3usc", urn: "urn:1:acme-corp:cohost-falcon:/events/test-event-3/tickets/Jijy9YgcCtKcn6tk3usc",
    name: "General Admission - Fast Pass", type: "admission", category: "General Admission", status: "live", source: "joonbug",
    priceCategory: "paid", capacity: 50, quantitySold: 0, minimumQuantity: 1, maximumQuantity: 10, transferable: false,
    costs: { fee: "USD,990", tax: "USD,0", cost: "USD,9000", gross: "USD,9990", total: "USD,9990", delivery: "USD,295" },
  } as never);
  expect(input).toEqual({
    name: "General Admission - Fast Pass", cost: "USD,9000", capacity: 50, hidden: false, minimumQuantity: 1, maximumQuantity: 10,
  });
});

test("cohostTicketToEventbrite: sales window, order limits and URN ids carry over", () => {
  const input = cohostTicketToEventbrite({
    name: "VIP", category: "event", type: "admission", currency: "USD", price: "USD,9000", priceCategory: "paid",
    status: "hidden", transferable: false, salesStart: "2026-10-01T10:00:00.000Z", salesEnd: "2026-10-31T00:00:00Z",
    minimumQuantity: 1, maximumQuantity: 4, urn: "urn:1:co:conn_abc:/events/987/ticket_classes/55",
  });
  expect(input).toMatchObject({
    eventId: "987", ticketClassId: "55", hidden: true, minimumQuantity: 1, maximumQuantity: 4,
    salesStart: "2026-10-01T10:00:00Z", salesEnd: "2026-10-31T00:00:00Z",
  });
});
