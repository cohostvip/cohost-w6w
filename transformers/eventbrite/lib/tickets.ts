/**
 * Ticket mappers: Eventbrite Ticket Class ⇄ Cohost Ticket (an admission offering).
 *
 * Eventbrite's "ticket class" is Cohost's admission-type ticket. Price lives in
 * `cost` (absent/zero for free tickets); `hidden` + sell-through determine the
 * Cohost display status.
 */
import { cohostToEbAmount, ebToCohostAmount } from "./currency.ts";
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
    // Cohost requires both per-order limits; Eventbrite leaves them null when unset (dashboard defaults 1/10).
    minimumQuantity: eb.minimum_quantity ?? 1,
    maximumQuantity: eb.maximum_quantity ?? 10,
    status: ticketStatus(eb),
    priceCategory: isFree ? "free" : "paid",
    transferable: false,
    source: SOURCE,
    sourceId: eb.id,
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
    : { cost: cohostAmountString(t.price ?? t.costs?.cost) };
  const optional: Partial<EbTicketClassInput> = {
    description: t.description || undefined,
    capacity: t.quantity ?? t.capacity ?? undefined,
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
