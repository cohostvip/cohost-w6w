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
 * Line items: Eventbrite carries per-attendee rows; we aggregate them by
 * `ticket_class_id` into Cohost order items (quantity + summed costs).
 */
import { amountValue, cohostAmount, cohostToEbAmount } from "./currency.ts";
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
    items: aggregateAttendees(eb.attendees ?? [], currency),
    costs,
    source: SOURCE,
    sourceId: eb.id,
  };
}

/** Group attendees by ticket class into Cohost order items with summed costs. */
function aggregateAttendees(attendees: EbAttendee[], currency: string): CohostOrderItem[] {
  const byClass = new Map<string, CohostOrderItem>();

  for (const a of attendees) {
    const offeringId = a.ticket_class_id ?? "unknown";
    const qty = a.quantity ?? 1;
    const cost = a.costs?.base_price?.value ?? 0;
    const fee = (a.costs?.eventbrite_fee?.value ?? 0) + (a.costs?.payment_fee?.value ?? 0);
    const tax = a.costs?.tax?.value ?? 0;

    const existing = byClass.get(offeringId);
    if (existing) {
      existing.quantity += qty;
      existing.costs.cost = cohostAmount(currency, amountValue(existing.costs.cost) + cost);
      existing.costs.fee = cohostAmount(currency, amountValue(existing.costs.fee) + fee);
      existing.costs.tax = cohostAmount(currency, amountValue(existing.costs.tax) + tax);
      existing.costs.gross = cohostAmount(currency, amountValue(existing.costs.gross) + cost + fee);
    } else {
      byClass.set(offeringId, {
        offeringId,
        name: a.profile?.name,
        quantity: qty,
        costs: {
          cost: cohostAmount(currency, cost),
          fee: cohostAmount(currency, fee),
          tax: cohostAmount(currency, tax),
          gross: cohostAmount(currency, cost + fee),
        },
      });
    }
  }

  return [...byClass.values()];
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
    ticket_class_id: item.offeringId,
    quantity: item.quantity,
    profile: { name: item.name },
    costs: {
      base_price: cohostToEbAmount(item.costs.cost),
      eventbrite_fee: cohostToEbAmount(item.costs.fee),
      tax: cohostToEbAmount(item.costs.tax),
      gross: cohostToEbAmount(item.costs.gross),
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
