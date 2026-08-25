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
      ticket_class_id: "tc_1",
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
      ticket_class_id: "tc_1",
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

test("eventbriteOrderToCohost: attendees aggregate by ticket class", () => {
  const { items } = eventbriteOrderToCohost(ebOrder);
  expect(items).toHaveLength(1);
  expect(items[0].offeringId).toBe("tc_1");
  expect(items[0].quantity).toBe(2);
  expect(items[0].costs.cost).toBe("USD,5000");
  expect(items[0].costs.fee).toBe("USD,450");
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
  expect(back.attendees).toHaveLength(1);
  expect(back.attendees?.[0].ticket_class_id).toBe("tc_1");
  expect(back.attendees?.[0].quantity).toBe(2);
});
