/**
 * Ticket mappers: Eventbrite Ticket Class ⇄ Cohost Ticket (an admission offering).
 *
 * Eventbrite's "ticket class" is Cohost's admission-type ticket. Price lives in
 * `cost` (absent/zero for free tickets); `hidden` + sell-through determine the
 * Cohost display status.
 *
 * Mirrors the old Eventbrite importer (`functions/ebrite` formatters/ticket.ts): Cohost
 * tickets carry a `costs` object and a `capacity`, not `price`/`quantity`. Only `cost`
 * carries over — Eventbrite's own `fee`/`tax` are Eventbrite's charges, not Cohost's —
 * so `gross` and `total` equal `cost`.
 */
import { cohostAmount, cohostToEbAmount } from "./currency.ts";
import { ebDateTime, idFromUrn, importedId } from "./outbound.ts";
import type { CohostTicket, CohostTicketStatus, EbTicketClass, EbTicketClassInput } from "./types.ts";

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
  const cost = cohostAmount(currency, isFree ? 0 : eb.cost?.value ?? 0);
  const zero = cohostAmount(currency, 0);
  const capacity = eb.capacity ?? eb.quantity_total;

  return {
    name,
    display_name: name,
    description: eb.description ?? undefined,
    // Cohost's ticket category, as the dashboard and the old Eventbrite importer set it.
    category: "General Admission",
    type: "admission",
    costs: { cost, fee: zero, tax: zero, delivery: zero, gross: cost, total: cost },
    ...(capacity != null ? { capacity } : {}),
    quantitySold: eb.quantity_sold ?? 0,
    // Cohost requires both per-order limits; Eventbrite leaves them null when unset (dashboard defaults 1/10).
    minimumQuantity: eb.minimum_quantity ?? 1,
    maximumQuantity: eb.maximum_quantity ?? 10,
    status: ticketStatus(eb),
    priceCategory: eb.donation ? "donation" : isFree ? "free" : "paid",
    ...(eb.sales_start ? { salesStart: eb.sales_start } : {}),
    ...(eb.sales_end ? { salesEnd: eb.sales_end } : {}),
    ...(eb.sorting != null ? { sorting: eb.sorting } : {}),
    transferable: false,
    source: SOURCE,
    ...(eb.id ? { refId: eb.id } : {}),
  };
}

/**
 * Cohost ticket → the Eventbrite app's Create/Update Ticket Class inputs. Eventbrite
 * wants exactly one of `free`, `donation` or `cost`; `ticketClassId` is set only for
 * a ticket imported from Eventbrite, so its presence picks update over create.
 */
export function cohostTicketToEventbrite(t: CohostTicket): EbTicketClassInput {
  const eventId = idFromUrn(t.urn, "events");
  const ticketClassId = idFromUrn(t.urn, "ticket_classes") ?? importedId(t);
  const pricing = t.priceCategory === "free" ? { free: true }
    : t.priceCategory === "donation" ? { donation: true }
    : { cost: cohostAmountString(t.costs?.cost ?? t.price) };
  const optional: Partial<EbTicketClassInput> = {
    description: t.description || undefined,
    capacity: t.capacity ?? t.quantity ?? undefined,
    salesStart: t.salesStart ? ebDateTime(t.salesStart) : undefined,
    salesEnd: t.salesEnd ? ebDateTime(t.salesEnd) : undefined,
    minimumQuantity: t.minimumQuantity ?? undefined,
    maximumQuantity: t.maximumQuantity ?? undefined,
  };
  return {
    ...(eventId ? { eventId } : {}),
    ...(ticketClassId ? { ticketClassId } : {}),
    name: t.display_name ?? t.name,
    ...pricing,
    hidden: t.status === "hidden",
    ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)),
  };
}

/** `"usd,4500"` → `"USD,4500"`, validated; the same string form Eventbrite's `cost` input takes. */
function cohostAmountString(price: string | undefined): string {
  const { currency, value } = cohostToEbAmount(price);
  return `${currency},${value}`;
}
