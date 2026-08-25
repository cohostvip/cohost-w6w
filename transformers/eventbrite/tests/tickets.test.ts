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
  expect(t.currency).toBe("USD");
  expect(t.price).toBe("USD,2500");
  expect(t.quantity).toBe(100);
  expect(t.status).toBe("live");
  expect(t.priceCategory).toBe("paid");
  expect(t.sourceId).toBe("tc_1");
});

test("eventbriteTicketToCohost: free ticket", () => {
  const t = eventbriteTicketToCohost({ id: "tc_2", name: "RSVP", free: true, quantity_total: 50 });
  expect(t.priceCategory).toBe("free");
  expect(t.price).toBe("USD,0");
});

test("eventbriteTicketToCohost: sold-out and hidden statuses", () => {
  expect(eventbriteTicketToCohost({ ...paid, quantity_sold: 100 }).status).toBe("sold-out");
  expect(eventbriteTicketToCohost({ ...paid, hidden: true }).status).toBe("hidden");
});

test("cohostTicketToEventbrite: round-trips a paid ticket", () => {
  const back = cohostTicketToEventbrite(eventbriteTicketToCohost(paid));
  expect(back.name).toBe("General Admission");
  expect(back.free).toBe(false);
  expect(back.cost?.value).toBe(2500);
  expect(back.cost?.currency).toBe("USD");
  expect(back.quantity_total).toBe(100);
  expect(back.hidden).toBe(false);
});

test("cohostTicketToEventbrite: free ticket has null cost", () => {
  const back = cohostTicketToEventbrite(eventbriteTicketToCohost({ name: "RSVP", free: true }));
  expect(back.free).toBe(true);
  expect(back.cost).toBeNull();
});
