import type { OutputField } from "./w6w-triggers.ts";

/**
 * What the triggers hand a workflow — declared `output` + a matching `sample`, so the editor
 * can offer a trigger's fields before the trigger has ever fired. Every trigger hands the same
 * envelope (`TriggerPayload`, `payload.ts`): `{ urn, action, type, id, timestamp, data, meta }`;
 * only what `data` holds differs (the order, event, ticket or attendee).
 *
 * Shapes follow what the Cohost API returns through `lib/client.ts` (envelope unwrapped):
 *   - `GET /orders/{id}` → `OrderDetails` `{ order, organizer, transaction, transactions }`
 *     (`organizer` / `transaction` are always `null` today; `transactions` drops `raw`).
 *   - `GET /events/{id}` → the event profile.
 *   - `GET /events/{id}/tickets/{ticketId}` → the ticket (an offering).
 *   - `GET /events/{id}/attendees/{attendeeId}` → the attendee.
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
  attendee: "SampleOrderItem01.0",
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

// ---- attendee -------------------------------------------------------------------------------

/**
 * An attendee — one per admission an order produced (`<orderItemId>.<index>`), or one imported /
 * added by hand. Keys taken from real attendee records.
 */
export const ATTENDEE_OUTPUT: OutputField[] = [
  s("id", "Attendee ID"),
  s("orderId", "Order ID"),
  s("orderNumber", "Order number"),
  s("orderItemId", "Order item ID"),
  n("index", "Index within the order item"),
  s("offeringId", "Ticket ID"),
  s("status", "Status (attending, …)"),
  s("source", "Source (online, imported, offline, onsite)"),
  b("checkedIn", "Checked in"),
  s("uid", "User ID"),
  a("barcodes", "Barcodes"),
  o("profile", "Attendee profile"),
  s("profile.first", "First name"),
  s("profile.last", "Last name"),
  s("profile.name", "Full name"),
  s("profile.email", "Email"),
  s("profile.phone", "Phone"),
  o("offeringSnapshot", "Ticket at purchase"),
  s("offeringSnapshot.id", "Ticket ID"),
  s("offeringSnapshot.name", "Ticket name"),
  s("offeringSnapshot.type", "Ticket type (admission, …)"),
  s("offeringSnapshot.category", "Ticket category"),
  s("created", "Created (UTC)"),
  s("changed", "Changed (UTC)"),
];

export const ATTENDEE_SAMPLE = {
  id: ID.attendee,
  orderId: ID.order,
  orderNumber: "100123",
  orderItemId: "SampleOrderItem01",
  index: 0,
  offeringId: ID.ticket,
  status: "attending",
  source: "online",
  checkedIn: false,
  uid: "usr_sample",
  barcodes: ["SAMPLEBARCODE01"],
  profile: {
    first: "Sam",
    last: "Sample",
    name: "Sam Sample",
    email: "sam@example.com",
    phone: "+15555550100",
  },
  offeringSnapshot: {
    id: ID.ticket,
    name: "General Admission",
    type: "admission",
    category: "General",
  },
  created: "2026-11-01T20:34:09.000Z",
  changed: "2026-11-01T20:34:09.000Z",
};

// ---- trigger payloads -----------------------------------------------------------------------

/** The envelope every trigger shares; `data` is declared per trigger. */
function payloadOutput(dataLabel: string, dataFields: readonly OutputField[], extraMeta: OutputField[] = []): OutputField[] {
  return [
    s("urn", "URN of the object that changed"),
    s("action", "Action (e.g. order.placed, event.updated)"),
    s("type", "Type (event, offering, order, attendee)"),
    s("id", "Object ID"),
    s("timestamp", "When it happened (UTC)"),
    o("data", `${dataLabel} (null once deleted)`),
    ...prefixOutput("data", dataFields),
    o("meta", "Meta"),
    a("meta.changedFields", "Changed fields (e.g. costs, costs.tax)"),
    s("meta.companyId", "Company ID"),
    s("meta.eventId", "Event ID (null when none)"),
    s("meta.resourcePath", "Resource path"),
    s("meta.deliveryId", "Delivery ID"),
    ...extraMeta,
  ];
}

/** A sample payload for `<type>.<what>` on `resourcePath`, carrying `data`. */
function payloadSample(
  action: string,
  resourcePath: string,
  data: unknown,
  changedFields: string[],
  extraMeta: Record<string, unknown> = {},
) {
  const segments = resourcePath.split("/").filter(Boolean);
  return {
    urn: `urn:1:${ID.company}:cohost-falcon:${resourcePath}`,
    action,
    type: action.slice(0, action.indexOf(".")),
    id: segments[segments.length - 1],
    timestamp: "2026-11-01T20:34:10.000Z",
    data,
    meta: {
      changedFields,
      companyId: ID.company,
      eventId: ID.event,
      resourcePath,
      deliveryId: "trg_sample",
      ...extraMeta,
    },
  };
}

/** The order triggers: `data` is the order, `meta.transactions` its payments. */
export const ORDER_TRIGGER_OUTPUT: OutputField[] = payloadOutput("Order", ORDER_OUTPUT, [
  a("meta.transactions", "Payment transactions", TRANSACTION_FIELDS),
]);
export function orderTriggerSample(action: string, changedFields: string[] = []) {
  return payloadSample(action, `/orders/${ID.order}`, ORDER_SAMPLE, changedFields, {
    transactions: ORDER_DETAILS_SAMPLE.transactions,
  });
}

export const EVENT_CHANGED_OUTPUT: OutputField[] = payloadOutput("Event", EVENT_OUTPUT);
export const EVENT_CHANGED_SAMPLE = payloadSample("event.updated", `/events/${ID.event}`, EVENT_SAMPLE, [
  "name",
  "start",
]);

export const TICKET_CHANGED_OUTPUT: OutputField[] = payloadOutput("Ticket", TICKET_OUTPUT);
export const TICKET_CHANGED_SAMPLE = payloadSample(
  "offering.updated",
  `/events/${ID.event}/tickets/${ID.ticket}`,
  TICKET_SAMPLE,
  ["costs", "costs.tax", "costs.total", "changed"],
);

export const ATTENDEE_CHANGED_OUTPUT: OutputField[] = payloadOutput("Attendee", ATTENDEE_OUTPUT);
export const ATTENDEE_CHANGED_SAMPLE = payloadSample(
  "attendee.created",
  `/events/${ID.event}/attendees/${ID.attendee}`,
  ATTENDEE_SAMPLE,
  [],
);

// ---- sales channel --------------------------------------------------------------------------

/** A sales channel the company owns, as `GET /company/sales-channels/{id}` returns it. */
export const CHANNEL_OUTPUT: OutputField[] = [
  s("id", "Channel ID"),
  s("name", "Name"),
  s("description", "Description"),
  s("type", "Type (website, social, promoter, affiliate, api, seller, other)"),
  s("status", "Status (active, inactive)"),
  b("isPublic", "Public in the marketplace"),
  s("code", "Attribution code"),
  a("tags", "Tags"),
  o("listingOptions", "Listing options (description formats, fees, extra listings, properties)"),
  o("pricing", "Default pricing for your own events' listings that set none"),
  s("pricing.formulaId", "Default price formula ID"),
  n("pricing.markupPercent", "Default markup %"),
  s("logo.url", "Logo (marketplace branding)"),
  s("brandColor", "Brand color (marketplace branding)"),
  s("companyId", "Company ID"),
  s("created", "Created (UTC)"),
  s("changed", "Changed (UTC)"),
];

/** One event listed on a channel, as `GET /company/sales-channels/{id}/events` returns it. */
export const CHANNEL_LISTED_EVENT_OUTPUT: OutputField[] = [
  s("id", "Event ID"),
  s("slug", "Slug"),
  s("name", "Name"),
  s("start", "Start (ISO)"),
  s("end", "End (ISO)"),
  s("tz", "Timezone"),
  s("status", "Event status"),
  s("flyer.url", "Flyer URL"),
  o("location", "Location"),
  s("listing.visibility", "Visibility on the channel (visible, hidden)"),
  a("listing.tags", "Listing tags"),
  o("listing.meta", "Listing meta"),
  n("listing.priority", "Listing priority"),
  b("listing.orphaned", "Orphaned (the event is no longer live, so the channel does not show it)"),
];

/** One listing of an event on a channel, with the values the channel keeps on it. */
export const CHANNEL_LISTING_OUTPUT: OutputField[] = [
  s("eventId", "Event ID"),
  s("channelId", "Channel ID"),
  s("listingId", "Listing ID (primary, or an extra listing's id)"),
  s("slug", "Listing slug"),
  o("properties", "Listing properties"),
];

/**
 * One listing of an event as a sales channel shows it — `GET /events/{id}` with the channel
 * header: the channel's name for it, its content blocks (the `description` block carries the
 * channel's description) and whether ticket sales are on. Cohost sends a channel no
 * `description`, `ticketPrices` or `searchTags`: prices are on the listing's tickets.
 */
export const CHANNEL_EVENT_OUTPUT: OutputField[] = [
  ...EVENT_OUTPUT,
  a("contentBlocks", "Content blocks (the \"description\" block holds the description on the channel)"),
  b("salesEnabled", "Ticket sales on (false while the organizer has paused them on the channel)"),
];
export const CHANNEL_EVENT_SAMPLE = {
  ...EVENT_SAMPLE,
  name: "Friday Night Social — on Sample Channel",
  contentBlocks: [
    {
      id: "details",
      type: "richtext",
      designation: "description",
      title: "Details",
      status: "live",
      order: 1,
      data: { content: { html: "<p>Live DJs, a welcome drink and a packed room.</p>" } },
    },
  ],
  salesEnabled: true,
};

/**
 * One ticket as a sales channel sells it — `GET /events/{id}/tickets` with the channel header:
 * the channel's price with its fees recomputed, `status` `unavailable` while the organizer has
 * paused sales on the channel, and no owner-only stock figures (capacity, quantity sold).
 */
export const CHANNEL_TICKET_OUTPUT: OutputField[] = TICKET_OUTPUT.filter(
  (f) => f.key !== "capacity" && f.key !== "quantitySold",
).map((f) =>
  f.key === "status"
    ? { ...f, label: "Status (live, sold-out; unavailable while sales on the channel are paused)" }
    : f.key === "costs.cost"
    ? { ...f, label: `Price on the channel ${COSTS_HINT}` }
    : f
);
const { capacity: _capacity, quantitySold: _sold, ...CHANNEL_TICKET_SAMPLE_BASE } = TICKET_SAMPLE;
export const CHANNEL_TICKET_SAMPLE = {
  ...CHANNEL_TICKET_SAMPLE_BASE,
  costs: { ...TICKET_SAMPLE.costs, cost: "USD,2750", gross: "USD,3025", total: "USD,3025" },
};

/**
 * Channel Event Changed: `data` is one listing of the event as the channel shows it (its channel
 * name and content blocks); `meta` names the channel and the listing.
 */
export const CHANNEL_EVENT_CHANGED_OUTPUT: OutputField[] = [
  ...payloadOutput("The event as the channel shows this listing", CHANNEL_EVENT_OUTPUT).map((f) =>
    f.key === "type"
      ? { ...f, label: "Type (channelEvent)" }
      : f.key === "meta.changedFields"
      ? { ...f, label: "Changed fields (e.g. event.name, tickets.<id>.costs, customization)" }
      : f
  ),
  s("meta.channelId", "Channel ID"),
  s("meta.listingId", "Listing ID (primary, or an extra listing's id)"),
  o("meta.properties", "Listing properties (values your channel keeps on this listing, e.g. a synced id)"),
];
export const CHANNEL_EVENT_CHANGED_SAMPLE = {
  ...payloadSample(
    "channelEvent.changed",
    `/channels/ch_sample/events/${ID.event}/listings/primary`,
    CHANNEL_EVENT_SAMPLE,
    ["tickets.SampleTicket01.costs"],
    { channelId: "ch_sample", listingId: "primary", properties: { eventbriteId: "1234567890" } },
  ),
  type: "channelEvent",
  id: ID.event,
};

/**
 * Object Changed fires for any type, so its `data` is whichever object changed — only `id` is
 * common to all; the rest matches the type's `get-*` action.
 */
export const OBJECT_CHANGED_OUTPUT: OutputField[] = payloadOutput(
  "The object (fields depend on type; same as its get-* action)",
  [s("id", "Object ID")],
);
export const OBJECT_CHANGED_SAMPLE = payloadSample(
  "offering.updated",
  `/events/${ID.event}/tickets/${ID.ticket}`,
  { id: ID.ticket },
  ["capacity"],
);

/**
 * Channel Changed: one trigger for every object of a sales channel. `action` is the general verb
 * (`event.change` | `ticket.change`), `type` the object (`channelEvent` | `offering`), and
 * `meta.change` the fine action. `data` is the channel's listing (event.change) or the ticket
 * (ticket.change) — null once unlisted/deleted — so it is loosely typed.
 */
export const CHANNEL_CHANGED_OUTPUT: OutputField[] = [
  ...payloadOutput("The channel listing (event.change) or the ticket (ticket.change)", []).map((f) =>
    f.key === "action"
      ? { ...f, label: "Action (event.change | ticket.change)", enum: ["event.change", "ticket.change"] }
      : f.key === "type"
      ? { ...f, label: "Type (channelEvent | offering)" }
      : f.key === "id"
      ? { ...f, label: "Event ID (event.change) or ticket ID (ticket.change)" }
      : f
  ),
  s("meta.channelId", "Channel ID"),
  s("meta.change", "What happened (listed|changed|unlisted|created|updated|deleted)"),
  s("meta.ticketId", "Ticket ID (ticket.change only)"),
  s("meta.listingId", "Listing ID (event.change only)"),
  o("meta.properties", "Listing properties (event.change only)"),
];
export const CHANNEL_CHANGED_SAMPLE = {
  ...payloadSample(
    "channelEvent.changed",
    `/channels/ch_sample/events/${ID.event}/listings/primary`,
    CHANNEL_EVENT_SAMPLE,
    [],
    { channelId: "ch_sample", change: "changed", ticketId: null, listingId: "primary", properties: { eventbriteId: "1234567890" } },
  ),
  action: "event.change",
  type: "channelEvent",
  id: ID.event,
};
