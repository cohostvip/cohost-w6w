/**
 * Order mappers: Eventbrite Order ⇄ Cohost Order.
 *
 * The two cost models differ, so we normalize through minor units:
 *   - Eventbrite splits fees into `eventbrite_fee` + `payment_fee`; Cohost has a
 *     single `fee`. We sum on the way in and put the total back on `eventbrite_fee`
 *     on the way out (payment_fee → 0), which round-trips the total.
 *   - Cohost's `gross` excludes tax (`gross = cost + fee - discount`) and `total`
 *     includes it; we compute both from the components rather than trusting
 *     Eventbrite's `gross`, whose tax handling varies by endpoint.
 *   - Eventbrite exposes no order-level discount/delivery, so those are `0`.
 *
 * Line items: one Cohost order item per Eventbrite attendee (keyed by the
 * attendee id), with per-unit `cost`/`fee`/`tax` and line totals.
 */
import { cohostAmount, cohostToEbAmount } from "./currency.ts";
import type {
  CohostOrder,
  CohostOrderCosts,
  CohostOrderItem,
  CohostOrderStatus,
  EbAttendee,
  EbOrder,
} from "./types.ts";

const SOURCE = "eventbrite";

const EB_TO_COHOST_STATUS: Record<string, CohostOrderStatus> = {
  placed: "placed",
  refunded: "refunded",
  deleted: "voided",
  voided: "voided",
  cancelled: "voided",
  canceled: "voided",
};

function orderStatus(eb: EbOrder): CohostOrderStatus {
  return EB_TO_COHOST_STATUS[(eb.status ?? "").toLowerCase()] ?? "placed";
}

export function eventbriteOrderToCohost(eb: EbOrder): CohostOrder {
  const currency = (eb.currency ?? eb.costs?.gross?.currency ?? "USD").toUpperCase();
  const c = eb.costs ?? {};

  const subtotal = c.base_price?.value ?? 0;
  const fee = (c.eventbrite_fee?.value ?? 0) + (c.payment_fee?.value ?? 0);
  const tax = c.tax?.value ?? 0;
  const gross = subtotal + fee; // cost + fee - discount(0)
  const total = gross + tax;

  const costs: CohostOrderCosts = {
    subtotal: cohostAmount(currency, subtotal),
    fee: cohostAmount(currency, fee),
    tax: cohostAmount(currency, tax),
    discount: cohostAmount(currency, 0),
    delivery: cohostAmount(currency, 0),
    gross: cohostAmount(currency, gross),
    preDiscount: cohostAmount(currency, gross),
    total: cohostAmount(currency, total),
  };

  const name = eb.name?.trim() || [eb.first_name, eb.last_name].filter(Boolean).join(" ").trim();

  return {
    orderNumber: eb.id,
    status: orderStatus(eb),
    currency,
    customer: {
      name: name || (eb.email ?? "Guest"),
      firstName: eb.first_name,
      lastName: eb.last_name,
      email: eb.email ?? null,
      uid: null,
    },
    items: attendeeItems(eb.attendees ?? [], currency),
    costs,
    source: SOURCE,
    sourceId: eb.id,
  };
}

/**
 * One Cohost order item per Eventbrite attendee, as the old importer did
 * (`functions/ebrite` formatters/orderItem.ts + cost.ts): the attendee id is the
 * item id (stable across re-syncs) and its costs are the attendee's, per unit.
 * Same formulas as the order: fee = eventbrite_fee + payment_fee,
 * gross = preDiscount = cost + fee, total = gross + tax.
 */
function attendeeItems(attendees: EbAttendee[], currency: string): CohostOrderItem[] {
  return attendees.map((a) => {
    const quantity = a.quantity ?? 1;
    const cost = a.costs?.base_price?.value ?? 0;
    const fee = (a.costs?.eventbrite_fee?.value ?? 0) + (a.costs?.payment_fee?.value ?? 0);
    const tax = a.costs?.tax?.value ?? 0;
    const amount = (minor: number) => cohostAmount(currency, minor);
    return {
      ...(a.id ? { id: a.id } : {}),
      offeringId: a.ticket_class_id ?? "unknown",
      offeringType: "admission",
      ...(a.ticket_class_name ? { name: a.ticket_class_name } : {}),
      quantity,
      costs: {
        cost: amount(cost),
        fee: amount(fee),
        tax: amount(tax),
        delivery: amount(0),
        discount: amount(0),
        subtotal: amount(cost * quantity),
        gross: amount((cost + fee) * quantity),
        preDiscount: amount((cost + fee) * quantity),
        total: amount((cost + fee + tax) * quantity),
      },
    };
  });
}

const COHOST_TO_EB_STATUS: Record<CohostOrderStatus, string> = {
  placed: "placed",
  refunded: "refunded",
  voided: "deleted",
};

export function cohostOrderToEventbrite(order: CohostOrder): EbOrder {
  const currency = order.currency.toUpperCase();

  const costs = {
    base_price: cohostToEbAmount(order.costs.subtotal),
    eventbrite_fee: cohostToEbAmount(order.costs.fee),
    payment_fee: { currency, value: 0, major_value: "0.00", display: `0.00 ${currency}` },
    tax: cohostToEbAmount(order.costs.tax),
    gross: cohostToEbAmount(order.costs.total),
  };

  const attendees: EbAttendee[] = order.items.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    ticket_class_id: item.offeringId,
    quantity: item.quantity,
    ...(item.name ? { ticket_class_name: item.name } : {}),
    costs: {
      base_price: cohostToEbAmount(item.costs.cost),
      eventbrite_fee: cohostToEbAmount(item.costs.fee),
      tax: cohostToEbAmount(item.costs.tax),
      gross: cohostToEbAmount(item.costs.total ?? item.costs.gross),
    },
  }));

  return {
    id: order.sourceId ?? order.orderNumber,
    name: order.customer.name,
    first_name: order.customer.firstName,
    last_name: order.customer.lastName,
    email: order.customer.email ?? undefined,
    status: COHOST_TO_EB_STATUS[order.status] ?? "placed",
    currency,
    costs,
    attendees,
  };
}
