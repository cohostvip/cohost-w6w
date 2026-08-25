/**
 * Ticket mappers: Eventbrite Ticket Class ⇄ Cohost Ticket (an admission offering).
 *
 * Eventbrite's "ticket class" is Cohost's admission-type ticket. Price lives in
 * `cost` (absent/zero for free tickets); `hidden` + sell-through determine the
 * Cohost display status.
 */
import { cohostToEbAmount, ebToCohostAmount } from "./currency.ts";
import type { CohostTicket, CohostTicketStatus, EbCurrency, EbTicketClass } from "./types.ts";

const SOURCE = "eventbrite";

function ticketStatus(eb: EbTicketClass): CohostTicketStatus {
  if (eb.hidden) return "hidden";
  const total = eb.quantity_total ?? null;
  const sold = eb.quantity_sold ?? 0;
  if (total !== null && total > 0 && sold >= total) return "sold-out";
  return "live";
}

export function eventbriteTicketToCohost(eb: EbTicketClass, fallbackCurrency = "USD"): CohostTicket {
  const isFree = eb.free === true || !eb.cost || (eb.cost.value ?? 0) === 0;
  const currency = (eb.cost?.currency ?? fallbackCurrency).toUpperCase();
  const name = eb.name?.trim() || "Ticket";

  return {
    name,
    display_name: name,
    description: eb.description ?? undefined,
    category: "event",
    type: "admission",
    currency,
    price: ebToCohostAmount(eb.cost, currency),
    quantity: eb.quantity_total ?? undefined,
    quantitySold: eb.quantity_sold ?? 0,
    status: ticketStatus(eb),
    priceCategory: isFree ? "free" : "paid",
    transferable: false,
    source: SOURCE,
    sourceId: eb.id,
  };
}

export function cohostTicketToEventbrite(t: CohostTicket): EbTicketClass {
  const isFree = t.priceCategory === "free";
  const cost: EbCurrency | null = isFree ? null : cohostToEbAmount(t.price);

  return {
    id: t.sourceId,
    name: t.display_name ?? t.name,
    description: t.description ?? null,
    free: isFree,
    cost,
    quantity_total: t.quantity ?? null,
    quantity_sold: t.quantitySold ?? 0,
    hidden: t.status === "hidden",
  };
}
