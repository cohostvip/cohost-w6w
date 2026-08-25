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
  free?: boolean;
  quantity_total?: number | null;
  quantity_sold?: number;
  minimum_quantity?: number | null;
  maximum_quantity?: number | null;
  hidden?: boolean;
  sales_start?: string | null;
  sales_end?: string | null;
  event_id?: string;
  [k: string]: unknown;
}

export interface EbAttendee {
  id?: string;
  ticket_class_id?: string;
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

export interface CohostEvent {
  id?: string;
  name: string;
  summary: string;
  description?: string | null;
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
  id?: string;
  name: string;
  display_name?: string;
  description?: string;
  category: string;
  type: "admission" | "package" | "admission.tableCommitment";
  currency: string;
  /** Cohost currency-amount string, e.g. `"USD,1000"`. */
  price: string;
  quantity?: number;
  quantitySold?: number;
  status: CohostTicketStatus;
  priceCategory: "donation" | "free" | "paid" | "other";
  transferable: boolean;
  source?: string;
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
  offeringId: string;
  name?: string;
  quantity: number;
  costs: {
    cost: string;
    fee: string;
    tax: string;
    gross: string;
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
