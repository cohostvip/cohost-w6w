/**
 * Light structural types for both sides of the transform.
 *
 * These are deliberately partial: a transformer must be forgiving of the exact
 * payload it receives (Eventbrite adds fields; Cohost objects arrive at various
 * levels of hydration). We model the fields we actually read/write and treat the
 * rest as pass-through. They are NOT the authoritative schemas — Cohost's live in
 * `@cohostvip/types`, Eventbrite's in its v3 API docs — just the projection this
 * app maps between.
 */

// ────────────────────────────── Eventbrite ──────────────────────────────
// Shapes per the Eventbrite v3 API (https://www.eventbrite.com/platform/api).

/** Eventbrite's multipart text field: `{ text, html }`. */
export interface EbText {
  text?: string | null;
  html?: string | null;
}

/** Eventbrite datetime triple. `utc` is ISO-8601 Zulu; `timezone` is an IANA name. */
export interface EbDateTime {
  timezone?: string;
  local?: string;
  utc?: string;
}

/** Eventbrite money object. `value` is in minor units (cents); `major_value` is decimal. */
export interface EbCurrency {
  currency?: string;
  value?: number;
  major_value?: string;
  display?: string;
}

export interface EbEvent {
  ticket_classes?: EbTicketClass[] | null;
  id?: string;
  name?: EbText;
  summary?: string | null;
  description?: EbText;
  start?: EbDateTime;
  end?: EbDateTime;
  currency?: string;
  online_event?: boolean;
  listed?: boolean;
  status?: string;
  url?: string;
  capacity?: number | null;
  logo?: { url?: string; original?: { url?: string; width?: number; height?: number } } | null;
  organizer_id?: string;
  venue_id?: string | null;
  category_id?: string | null;
  created?: string;
  changed?: string;
  [k: string]: unknown;
}

export interface EbTicketClass {
  id?: string;
  name?: string;
  description?: string | null;
  cost?: EbCurrency | null;
  fee?: EbCurrency | null;
  tax?: EbCurrency | null;
  free?: boolean;
  donation?: boolean;
  capacity?: number | null;
  quantity_total?: number | null;
  quantity_sold?: number;
  minimum_quantity?: number | null;
  maximum_quantity?: number | null;
  hidden?: boolean;
  sales_start?: string | null;
  sales_end?: string | null;
  sorting?: number;
  event_id?: string;
  [k: string]: unknown;
}

export interface EbAttendee {
  id?: string;
  ticket_class_id?: string;
  ticket_class_name?: string;
  quantity?: number;
  profile?: { name?: string; first_name?: string; last_name?: string; email?: string; cell_phone?: string };
  costs?: {
    base_price?: EbCurrency;
    gross?: EbCurrency;
    eventbrite_fee?: EbCurrency;
    payment_fee?: EbCurrency;
    tax?: EbCurrency;
  };
  [k: string]: unknown;
}

export interface EbOrder {
  id?: string;
  created?: string;
  changed?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  event_id?: string;
  currency?: string;
  costs?: {
    base_price?: EbCurrency;
    gross?: EbCurrency;
    eventbrite_fee?: EbCurrency;
    payment_fee?: EbCurrency;
    tax?: EbCurrency;
  };
  attendees?: EbAttendee[];
  [k: string]: unknown;
}

/**
 * Inputs for the Eventbrite app's Create Event / Update Event actions — what
 * `cohost-to-eventbrite` produces, so each field binds straight onto them.
 * Read-only Eventbrite fields (status, url, logo URL, ids of other objects) are
 * not part of it: status changes go through Publish Event, a logo through Upload Media.
 */
export interface EbEventInput {
  /** The Eventbrite event this Cohost event was imported from; set only then (→ Update Event). */
  eventId?: string;
  name: string;
  /** Plain text, max 140 characters (Eventbrite's limit). */
  summary?: string;
  /** `YYYY-MM-DDThh:mm:ssZ` — Eventbrite rejects fractional seconds. */
  startUtc?: string;
  endUtc?: string;
  timezone?: string;
  currency: string;
  capacity?: number;
  listed?: boolean;
  /** Expanded Cohost tickets, as Create/Update Ticket Class inputs. */
  ticketClasses?: EbTicketClassInput[];
}

/** Inputs for the Eventbrite app's Create / Update Ticket Class actions. */
export interface EbTicketClassInput {
  /** The Eventbrite event of an imported ticket, when known. */
  eventId?: string;
  /** The Eventbrite ticket class this Cohost ticket was imported from; set only then (→ Update Ticket Class). */
  ticketClassId?: string;
  name: string;
  description?: string;
  /** `"USD,4500"` — currency, comma, minor units. Only on paid tickets. */
  cost?: string;
  free?: boolean;
  donation?: boolean;
  capacity?: number;
  hidden: boolean;
  salesStart?: string;
  salesEnd?: string;
  minimumQuantity?: number;
  maximumQuantity?: number;
}

// ─────────────────────────────── Cohost ───────────────────────────────
// Projections of `@cohostvip/types` — the fields this transformer reads/writes.

/** Cohost photo. `url` is the primary image. */
export interface CohostPhoto {
  url: string;
  "2x"?: string;
  width?: number;
  height?: number;
  caption?: string;
}

export type CohostEventStatus =
  | "archived"
  | "queued"
  | "draft"
  | "live"
  | "started"
  | "ended"
  | "completed"
  | "canceled";

/** Cohost's multi-format text (the API returns event descriptions in this shape). */
export interface CohostMultipartText {
  html?: string;
  text?: string;
  md?: string;
  [k: string]: unknown;
}

export interface CohostEvent {
  urn?: string;
  /** Expanded Eventbrite ticket classes, mapped to Cohost tickets when present. */
  tickets?: CohostTicket[];
  id?: string;
  name: string;
  summary: string;
  /** A plain HTML string, or the multipart text the Cohost API returns. */
  description?: string | CohostMultipartText | null;
  companyId?: string;
  tz: string;
  /** ISO-8601. */
  start: string;
  /** ISO-8601. */
  end: string;
  status: CohostEventStatus;
  currency: string;
  flyer?: CohostPhoto | null;
  capacity?: number | null;
  /** Provenance of an imported event, e.g. `eventbrite`. */
  source?: string;
  /** The upstream id this event was imported from. */
  sourceId?: string;
  [k: string]: unknown;
}

export type CohostTicketStatus = "live" | "hidden" | "sold-out" | "draft" | "archived";

export interface CohostTicket {
  urn?: string;
  /** The URN of the event it belongs to (from Eventbrite's `event_id`). */
  event_urn?: string;
  id?: string;
  name: string;
  display_name?: string;
  description?: string;
  category: string;
  type: "admission" | "package" | "admission.tableCommitment";
  /** Legacy input aliases still accepted on the way out (Cohost writes take `costs.cost` / `capacity`). */
  currency?: string;
  price?: string;
  quantity?: number;
  /** Cohost currency-amount strings (`"USD,1000"`); `cost` is the ticket price before fees. */
  costs?: { cost?: string; fee?: string; tax?: string; delivery?: string; gross?: string; total?: string; [k: string]: unknown };
  capacity?: number;
  quantitySold?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  /** ISO-8601. */
  salesStart?: string;
  salesEnd?: string;
  status: CohostTicketStatus;
  priceCategory: "donation" | "free" | "paid" | "other";
  transferable: boolean;
  sorting?: number;
  source?: string;
  /** The Eventbrite ticket class id (Cohost's `refId`). */
  refId?: string;
  sourceId?: string;
  [k: string]: unknown;
}

export interface CohostCustomer {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  uid?: string | null;
}

export interface CohostOrderItem {
  /** The Eventbrite attendee id — stable, so a re-sync updates the same item. */
  id?: string;
  offeringId: string;
  offeringType?: "admission";
  /** The ticket class name. */
  name?: string;
  quantity: number;
  /** Per-unit `cost`/`fee`/`tax`/`delivery`; line totals `subtotal`/`gross`/`preDiscount`/`total`. */
  costs: {
    cost: string;
    fee: string;
    tax: string;
    gross: string;
    delivery?: string;
    discount?: string;
    subtotal?: string;
    preDiscount?: string;
    total?: string;
  };
}

export interface CohostOrderCosts {
  subtotal: string;
  fee: string;
  tax: string;
  discount: string;
  delivery: string;
  gross: string;
  preDiscount: string;
  total: string;
}

export type CohostOrderStatus = "placed" | "voided" | "refunded";

export interface CohostOrder {
  urn?: string;
  /** The URN of the event it belongs to (from Eventbrite's `event_id`). */
  event_urn?: string;
  id?: string;
  orderNumber?: string;
  status: CohostOrderStatus;
  currency: string;
  companyId?: string;
  organizerId?: string;
  customer: CohostCustomer;
  items: CohostOrderItem[];
  costs: CohostOrderCosts;
  source?: string;
  sourceId?: string;
  [k: string]: unknown;
}
