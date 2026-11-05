import { expect, test } from "vitest";
import { cohostOrderToEventbrite, eventbriteOrderToCohost } from "../lib/orders.ts";
import type { EbOrder } from "../lib/types.ts";

const ebOrder: EbOrder = {
  id: "ord_1",
  name: "Jane Doe",
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  status: "placed",
  currency: "USD",
  costs: {
    base_price: { currency: "USD", value: 5000 },
    eventbrite_fee: { currency: "USD", value: 300 },
    payment_fee: { currency: "USD", value: 150 },
    tax: { currency: "USD", value: 400 },
    gross: { currency: "USD", value: 5850 },
  },
  attendees: [
    {
      id: "att_1",
      ticket_class_id: "tc_1",
      ticket_class_name: "General Admission",
      quantity: 1,
      profile: { name: "Jane Doe", email: "jane@example.com" },
      costs: {
        base_price: { currency: "USD", value: 2500 },
        eventbrite_fee: { currency: "USD", value: 150 },
        payment_fee: { currency: "USD", value: 75 },
        tax: { currency: "USD", value: 200 },
      },
    },
    {
      id: "att_2",
      ticket_class_id: "tc_1",
      ticket_class_name: "General Admission",
      quantity: 1,
      profile: { name: "Guest", email: "guest@example.com" },
      costs: {
        base_price: { currency: "USD", value: 2500 },
        eventbrite_fee: { currency: "USD", value: 150 },
        payment_fee: { currency: "USD", value: 75 },
        tax: { currency: "USD", value: 200 },
      },
    },
  ],
};

test("eventbriteOrderToCohost: customer + status + currency", () => {
  const o = eventbriteOrderToCohost(ebOrder);
  expect(o.status).toBe("placed");
  expect(o.currency).toBe("USD");
  expect(o.customer.name).toBe("Jane Doe");
  expect(o.customer.email).toBe("jane@example.com");
  expect(o.sourceId).toBe("ord_1");
});

test("eventbriteOrderToCohost: costs sum fees and compute gross/total", () => {
  const { costs } = eventbriteOrderToCohost(ebOrder);
  expect(costs.subtotal).toBe("USD,5000");
  expect(costs.fee).toBe("USD,450"); // eventbrite_fee + payment_fee
  expect(costs.tax).toBe("USD,400");
  expect(costs.gross).toBe("USD,5450"); // subtotal + fee
  expect(costs.total).toBe("USD,5850"); // gross + tax
  expect(costs.discount).toBe("USD,0");
});

test("eventbriteOrderToCohost: one item per attendee, keyed by the attendee id, with full item costs", () => {
  const { items } = eventbriteOrderToCohost(ebOrder);
  expect(items.map((item) => item.id)).toEqual(["att_1", "att_2"]);
  expect(items[0]).toEqual({
    id: "att_1",
    offeringId: "tc_1",
    offeringType: "admission",
    name: "General Admission",
    quantity: 1,
    costs: {
      cost: "USD,2500",
      fee: "USD,225", // eventbrite_fee + payment_fee
      tax: "USD,200",
      delivery: "USD,0",
      discount: "USD,0",
      subtotal: "USD,2500",
      gross: "USD,2725", // cost + fee
      preDiscount: "USD,2725",
      total: "USD,2925", // gross + tax
    },
  });
});

test("eventbriteOrderToCohost: item line totals scale with quantity; per-unit costs do not", () => {
  const [item] = eventbriteOrderToCohost({ ...ebOrder, attendees: [{ ...ebOrder.attendees![0], quantity: 2 }] }).items;
  expect(item.costs).toMatchObject({ cost: "USD,2500", fee: "USD,225", subtotal: "USD,5000", gross: "USD,5450", total: "USD,5850" });
});

test("eventbriteOrderToCohost: refunded / cancelled statuses", () => {
  expect(eventbriteOrderToCohost({ ...ebOrder, status: "refunded" }).status).toBe("refunded");
  expect(eventbriteOrderToCohost({ ...ebOrder, status: "cancelled" }).status).toBe("voided");
});

test("cohostOrderToEventbrite: round-trips totals and attendees", () => {
  const back = cohostOrderToEventbrite(eventbriteOrderToCohost(ebOrder));
  expect(back.status).toBe("placed");
  expect(back.email).toBe("jane@example.com");
  expect(back.costs?.base_price?.value).toBe(5000);
  expect(back.costs?.eventbrite_fee?.value).toBe(450);
  expect(back.costs?.payment_fee?.value).toBe(0);
  expect(back.costs?.gross?.value).toBe(5850);
  expect(back.attendees).toHaveLength(2);
  expect(back.attendees?.[0]).toMatchObject({ id: "att_1", ticket_class_id: "tc_1", ticket_class_name: "General Admission", quantity: 1 });
  expect(back.attendees?.[0].costs?.gross?.value).toBe(2925);
});
