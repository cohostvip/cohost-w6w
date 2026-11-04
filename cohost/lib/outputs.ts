import type { OutputField } from "./w6w-triggers.ts";
import { notificationOutput } from "./notification.ts";

/**
 * What the triggers hand a workflow — declared `output` + a matching `sample`, so the editor
 * can offer a trigger's fields before the trigger has ever fired.
 *
 * Shapes follow what the Cohost API returns through `lib/client.ts` (envelope unwrapped):
 *   - `GET /orders/{id}` → `OrderDetails` `{ order, organizer, transaction, transactions }`
 *     (`organizer` / `transaction` are always `null` today; `transactions` drops `raw`).
 *   - `GET /events/{id}` → the event profile.
 *   - `GET /events/{id}/tickets/{ticketId}` → the ticket (an offering).
 * Order fields were taken from real orders; only the commonly used ones are declared — the
 * payload carries more (e.g. `order.meta.costBreakdown`), reachable by path.
 *
 * A nested object is declared as dot paths (`order.customer.email`); an array of objects
 * declares `items` (keys relative to one element). Samples are SYNTHETIC: fake ids,
 * `@example.com` addresses. They carry every declared key, so each matches its `output`.
 */

const s = (key: string, label: string): OutputField => ({ key, type: "string", label });
const n = (key: string, label: string): OutputField => ({ key, type: "number", label });
const b = (key: string, label: string): OutputField => ({ key, type: "boolean", label });
const o = (key: string, label: string): OutputField => ({ key, type: "object", label });
const a = (key: string, label: string, items?: OutputField[]): OutputField =>
  items ? { key, type: "array", label, items } : { key, type: "array", label };

/** Prefix every key of a record shape (`id` -> `order.id`); `items` stay element-relative. */
function prefixOutput(prefix: string, fields: readonly OutputField[]): OutputField[] {
  return fields.map((f) => ({ ...f, key: `${prefix}.${f.key}` }));
}

/** Fake ids shared by the samples so a record's references line up. */
const ID = {
  company: "co_sample",
  organizer: "org_sample",
  event: "SampleEvent01",
  ticket: "SampleTicket01",
  order: "SampleOrder01",
  venue: "ven_sample",
} as const;

/** Cohost amounts are `"<CURRENCY>,<minor units>"` strings, e.g. `"USD,5500"` = $55.00. */
const COSTS_HINT = "(e.g. USD,5500)";

const address = (key: string, label: string): OutputField[] => [
  o(key, label),
  s(`${key}.address_1`, `${label} line 1`),
  s(`${key}.city`, `${label} city`),
  s(`${key}.region`, `${label} region`),
  s(`${key}.postal_code`, `${label} postal code`),
  s(`${key}.country`, `${label} country`),
];

const location = (key: string, label: string): OutputField[] => [
  o(key, label),
  s(`${key}.name`, `${label} name`),
  s(`${key}.venueId`, `${label} venue ID`),
  s(`${key}.timezone`, `${label} timezone`),
  ...address(`${key}.address`, `${label} address`),
  s(`${key}.address.formattedAddress`, `${label} formatted address`),
];

const LOCATION_SAMPLE = {
  name: "The Example Room",
  venueId: ID.venue,
  timezone: "America/New_York",
  address: {
    address_1: "100 Example St",
    city: "Baltimore",
    region: "MD",
    postal_code: "21230",
    country: "US",
    formattedAddress: "100 Example St Baltimore MD US 21230",
  },
};

// ---- ticket ---------------------------------------------------------------------------------

/** A ticket — an offering on the platform. */
export const TICKET_OUTPUT: OutputField[] = [
  s("id", "Ticket ID"),
  s("name", "Name"),
  s("type", "Type (admission, package, …)"),
  s("status", "Status (live, hidden, sold-out, …)"),
  s("category", "Category"),
  s("description", "Description (HTML)"),
  s("priceCategory", "Price category (free, paid, donation)"),
  n("capacity", "Capacity"),
  n("quantitySold", "Quantity sold"),
  n("minimumQuantity", "Minimum per order"),
  n("maximumQuantity", "Maximum per order"),
  n("sorting", "Sort order"),
  o("costs", "Costs"),
  s("costs.cost", `Price ${COSTS_HINT}`),
  s("costs.fee", "Fee"),
  s("costs.tax", "Tax"),
  s("costs.delivery", "Delivery"),
  s("costs.gross", "Gross"),
  s("costs.total", "Total"),
  s("created", "Created (UTC)"),
  s("changed", "Changed (UTC)"),
];

export const TICKET_SAMPLE = {
  id: ID.ticket,
  name: "General Admission",
  type: "admission",
  status: "live",
  category: "General Admission",
  description: "<ul><li>Admission for one guest</li></ul>",
  priceCategory: "paid",
  capacity: 200,
  quantitySold: 37,
  minimumQuantity: 1,
  maximumQuantity: 10,
  sorting: 0,
  costs: {
    cost: "USD,2500",
    fee: "USD,275",
    tax: "USD,0",
    delivery: "USD,0",
    gross: "USD,2775",
    total: "USD,2775",
  },
  created: "2026-10-01T15:00:00.000Z",
  changed: "2026-10-20T18:30:00.000Z",
};

// ---- event ----------------------------------------------------------------------------------

/** An event profile, as `GET /events/{id}` returns it. */
export const EVENT_OUTPUT: OutputField[] = [
  s("id", "Event ID"),
  s("name", "Name"),
  s("summary", "Summary"),
  s("slug", "Slug"),
  s("status", "Status (draft, live, …)"),
  b("public", "Public"),
  b("isSeries", "Is a series"),
  s("companyId", "Company ID"),
  s("organizerId", "Organizer ID"),
  s("start", "Start (ISO, event offset)"),
  s("end", "End (ISO, event offset)"),
  s("tz", "Timezone"),
  s("currency", "Currency"),
  n("capacity", "Capacity"),
  o("flyer", "Flyer"),
  s("flyer.url", "Flyer URL"),
  ...location("location", "Location"),
  a("tags", "Tags"),
  a("channels", "Channels"),
];

export const EVENT_SAMPLE = {
  id: ID.event,
  name: "Friday Night Social",
  summary: "Live DJs, a welcome drink and a packed room.",
  slug: "friday-night-social",
  status: "live",
  public: true,
  isSeries: false,
  companyId: ID.company,
  organizerId: ID.organizer,
  start: "2026-12-04T22:00:00.000-05:00",
  end: "2026-12-05T02:00:00.000-05:00",
  tz: "America/New_York",
  currency: "USD",
  capacity: 200,
  flyer: { url: "https://example.com/flyer.jpg" },
  location: LOCATION_SAMPLE,
  tags: ["nightlife"],
  channels: [],
};

// ---- order ----------------------------------------------------------------------------------

const ORDER_ITEM_FIELDS: OutputField[] = [
  s("id", "Item ID"),
  n("quantity", "Quantity"),
  s("offeringId", "Ticket ID"),
  s("offeringType", "Ticket type"),
  s("details", "Details"),
  s("purchaseGroupId", "Purchase group ID"),
  s("includedWithItemId", "Included with item ID"),
  o("costs", "Item costs"),
  s("costs.cost", `Unit price ${COSTS_HINT}`),
  s("costs.subtotal", "Subtotal"),
  s("costs.discount", "Discount"),
  s("costs.fee", "Fee"),
  s("costs.tax", "Tax"),
  s("costs.delivery", "Delivery"),
  s("costs.total", "Total"),
  o("offering", "Ticket"),
  s("offering.id", "Ticket ID"),
  s("offering.name", "Ticket name"),
  s("offering.type", "Ticket type"),
  s("offering.category", "Ticket category"),
  s("offering.description", "Ticket description (HTML)"),
];

const TRANSACTION_FIELDS: OutputField[] = [
  s("provider", "Provider (authnet, stripe)"),
  s("status", "Status (approved, declined, …)"),
  s("transId", "Provider transaction ID"),
  n("amount", "Amount (minor units)"),
  s("currency", "Currency"),
  s("created", "Created (UTC)"),
  s("contextId", "Context ID"),
  o("paymentMethod", "Payment method"),
  s("paymentMethod.type", "Payment method type"),
];

/** An order document — `order` inside {@link ORDER_DETAILS_OUTPUT}. */
const ORDER_OUTPUT: OutputField[] = [
  s("id", "Order ID"),
  s("orderNumber", "Order number"),
  s("status", "Status (placed, refunded, …)"),
  s("currency", "Currency"),
  s("companyId", "Company ID"),
  s("organizerId", "Organizer ID"),
  s("contextId", "Event context ID (evt_…)"),
  s("uid", "Buyer user ID"),
  s("created", "Created (UTC)"),
  s("changed", "Changed (UTC)"),
  o("costs", "Costs"),
  s("costs.subtotal", `Subtotal ${COSTS_HINT}`),
  s("costs.preDiscount", "Before discount"),
  s("costs.discount", "Discount"),
  s("costs.fee", "Fees"),
  s("costs.tax", "Tax"),
  s("costs.delivery", "Delivery"),
  s("costs.gross", "Gross"),
  s("costs.total", "Total"),
  o("customer", "Customer"),
  s("customer.uid", "Customer user ID"),
  s("customer.first", "First name"),
  s("customer.last", "Last name"),
  s("customer.name", "Full name"),
  s("customer.email", "Email"),
  s("customer.phone", "Phone"),
  s("customer.birthdate", "Birthdate"),
  ...address("customer.billingAddress", "Billing address"),
  a("items", "Items", ORDER_ITEM_FIELDS),
  a("coupons", "Coupons"),
  o("answers", "Checkout answers"),
  o("agreements", "Agreements"),
  b("agreements.agreedToTerms", "Agreed to terms"),
  b("agreements.agreedToOrganizerTerms", "Agreed to organizer terms"),
  b("agreements.emailOptIn", "Email opt-in"),
  b("agreements.textOptIn", "Text opt-in"),
  o("context", "Checkout context"),
  s("context.channelId", "Channel ID"),
  s("context.originDomain", "Origin domain"),
  s("context.cartSessionId", "Cart session ID"),
  o("meta", "Meta"),
  o("meta.resolvedContext", "Event"),
  s("meta.resolvedContext.id", "Event ID"),
  s("meta.resolvedContext.title", "Event title"),
  s("meta.resolvedContext.start", "Event start (UTC)"),
  s("meta.resolvedContext.end", "Event end (UTC)"),
  o("meta.resolvedContext.logo", "Event image"),
  s("meta.resolvedContext.logo.url", "Event image URL"),
  ...location("meta.resolvedContext.location", "Event location"),
];

const ORDER_SAMPLE = {
  id: ID.order,
  orderNumber: "10000000001",
  status: "placed",
  currency: "USD",
  companyId: ID.company,
  organizerId: ID.organizer,
  contextId: `evt_${ID.event}`,
  uid: "usr_sample",
  created: "2026-11-01T20:34:09.518Z",
  changed: "2026-11-01T20:34:09.518Z",
  costs: {
    subtotal: "USD,5000",
    preDiscount: "USD,5000",
    discount: "USD,0",
    fee: "USD,550",
    tax: "USD,0",
    delivery: "USD,295",
    gross: "USD,5845",
    total: "USD,5845",
  },
  customer: {
    uid: "usr_sample",
    first: "Sam",
    last: "Sample",
    name: "Sam Sample",
    email: "sam@example.com",
    phone: "+15555550100",
    birthdate: "1990-01-01",
    billingAddress: {
      address_1: "1 Sample Ave",
      city: "Springfield",
      region: "NY",
      postal_code: "10001",
      country: "US",
    },
  },
  items: [
    {
      id: "itm_sample",
      quantity: 2,
      offeringId: ID.ticket,
      offeringType: "admission",
      details: "",
      purchaseGroupId: null,
      includedWithItemId: null,
      costs: {
        cost: "USD,2500",
        subtotal: "USD,5000",
        discount: "USD,0",
        fee: "USD,550",
        tax: "USD,0",
        delivery: "USD,0",
        total: "USD,5550",
      },
      offering: {
        id: ID.ticket,
        name: "General Admission",
        type: "admission",
        category: "General Admission",
        description: "<ul><li>Admission for one guest</li></ul>",
      },
    },
  ],
  coupons: [],
  answers: {},
  agreements: { agreedToTerms: true, agreedToOrganizerTerms: true, emailOptIn: false, textOptIn: false },
  context: { channelId: null, originDomain: "example.com", cartSessionId: "cart_sample" },
  meta: {
    resolvedContext: {
      id: ID.event,
      title: "Friday Night Social",
      start: "2026-12-05T03:00:00.000Z",
      end: "2026-12-05T07:00:00.000Z",
      logo: { url: "https://example.com/flyer.jpg" },
      location: LOCATION_SAMPLE,
    },
  },
};

/** `GET /orders/{id}` — what the order triggers (and `get-order`) hand the workflow. */
export const ORDER_DETAILS_OUTPUT: OutputField[] = [
  o("order", "Order"),
  ...prefixOutput("order", ORDER_OUTPUT),
  o("organizer", "Organizer (currently always null)"),
  o("transaction", "Transaction (currently always null)"),
  a("transactions", "Payment transactions", TRANSACTION_FIELDS),
];

export const ORDER_DETAILS_SAMPLE = {
  order: ORDER_SAMPLE,
  organizer: null,
  transaction: null,
  transactions: [
    {
      provider: "authnet",
      status: "approved",
      transId: "60000000001",
      amount: 5845,
      currency: "usd",
      created: "2026-11-01T20:34:09.368Z",
      contextId: `ord_${ID.order}`,
      paymentMethod: { type: "card" },
    },
  ],
};

// ---- change notifications -------------------------------------------------------------------

/** A change notification (see `notification.ts`) for `<type>.<action>` on `resourcePath`. */
function notificationSample(type: string, action: string, resourcePath: string, changedFields: string[]) {
  const segments = resourcePath.split("/").filter(Boolean);
  return {
    urn: `urn:1:${ID.company}:cohost-falcon:${resourcePath}`,
    type,
    action,
    webhookEvent: `${type}.${action}`,
    id: segments[segments.length - 1],
    ...(segments[0] === "events" && segments[1] ? { eventId: segments[1] } : {}),
    resourcePath,
    companyId: ID.company,
    changedFields,
    timestamp: "2026-11-01T20:34:10.000Z",
  };
}

export const OBJECT_CHANGED_OUTPUT: OutputField[] = notificationOutput;
export const OBJECT_CHANGED_SAMPLE = notificationSample(
  "offering",
  "updated",
  `/events/${ID.event}/tickets/${ID.ticket}`,
  ["capacity"],
);

export const EVENT_CHANGED_OUTPUT: OutputField[] = [
  ...notificationOutput,
  o("event", "Event (null once deleted)"),
  ...prefixOutput("event", EVENT_OUTPUT),
];
export const EVENT_CHANGED_SAMPLE = {
  ...notificationSample("event", "updated", `/events/${ID.event}`, ["name", "start"]),
  event: EVENT_SAMPLE,
};

export const TICKET_CHANGED_OUTPUT: OutputField[] = [
  ...notificationOutput,
  o("ticket", "Ticket (null once deleted)"),
  ...prefixOutput("ticket", TICKET_OUTPUT),
];
export const TICKET_CHANGED_SAMPLE = {
  ...notificationSample("offering", "updated", `/events/${ID.event}/tickets/${ID.ticket}`, [
    "costs",
    "costs.tax",
    "costs.total",
    "changed",
  ]),
  ticket: TICKET_SAMPLE,
};
