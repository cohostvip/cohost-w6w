// lib/client.ts
var PROD_API_URL = "https://api.cohost.vip/v1";
var API_URL = typeof __COHOST_API_URL__ === "string" && __COHOST_API_URL__ !== "" ? __COHOST_API_URL__.replace(/\/+$/, "") : PROD_API_URL;
function unwrapEnvelope(body) {
  if (typeof body !== "object" || body === null) return body;
  const env = body;
  if (env.status !== "ok" || !("data" in env)) return body;
  if ("pagination" in env) return { results: env.data, pagination: env.pagination };
  return env.data;
}
var CohostClient = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  ctx;
  async request(path, options = {}) {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === void 0 || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    const headers = { ...options.headers ?? {} };
    const init = { method: options.method ?? "GET", headers };
    if (options.body !== void 0) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
      }
      throw new Error(
        `Cohost ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`
      );
    }
    if (res.status === 204) return void 0;
    const text = await res.text();
    if (text === "") return void 0;
    return unwrapEnvelope(JSON.parse(text));
  }
};

// auth/api-token.ts
var apiToken = {
  key: "api-token",
  type: "bearer",
  displayName: "Cohost API Token",
  description: "Paste a Cohost API token from your dashboard.",
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Cohost Dashboard \u2192 Settings \u2192 API keys."
    }
  ],
  // The only hook handed the raw credential; it runs network-less and just stamps
  // the outbound request. Actions never set this header themselves.
  sign({ request, credential }) {
    const { token } = credential;
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },
  // Verify the token is live with a bounded, authenticated read.
  async test({ credential }, ctx) {
    const { token } = credential;
    if (!token) return { ok: false, message: "credential missing token" };
    const res = await ctx.fetch(`${API_URL}/orders?limit=1`, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "token rejected (unauthorized)" };
    }
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    return { ok: true };
  }
};
var api_token_default = apiToken;

// auth/tenant.ts
var tenant = {
  key: "cohost",
  type: "tenantAuth",
  displayName: "Cohost account",
  description: "Uses the Cohost account you are signed in with.",
  tenantAuth: { link: "vip.cohost.w6w" },
  // W6W hands the minted token over in the same shape as a bearer credential.
  sign({ request, credential }) {
    const { token } = credential;
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },
  // The minted token has the same shape as a pasted one, so verify it the same way.
  test: api_token_default.test
};
var tenant_default = tenant;

// lib/notification.ts
function pingOf(raw) {
  return raw.body;
}
async function subscribeWebhook(ctx, name, callbackUrl, events) {
  const client = new CohostClient(ctx);
  const webhook = await client.request("/webhooks", {
    method: "POST",
    body: { name, url: callbackUrl, events }
  });
  return { webhookId: webhook.id };
}
async function unsubscribeWebhook(ctx, state) {
  const client = new CohostClient(ctx);
  await client.request(`/webhooks/${encodeURIComponent(state.webhookId)}`, { method: "DELETE" });
}
function pickValues(field, values, allowed, fallback) {
  const picked = Array.isArray(values) && values.length > 0 ? values.map(String) : [...fallback];
  const unknown = picked.filter((v) => !allowed.includes(v));
  if (unknown.length > 0) {
    throw new TypeError(`${field}: Unknown value(s) ${unknown.join(", ")}; expected ${allowed.join(", ")}.`);
  }
  return picked;
}

// lib/outputs.ts
var s = (key, label) => ({ key, type: "string", label });
var n = (key, label) => ({ key, type: "number", label });
var b = (key, label) => ({ key, type: "boolean", label });
var o = (key, label) => ({ key, type: "object", label });
var a = (key, label, items) => items ? { key, type: "array", label, items } : { key, type: "array", label };
function prefixOutput(prefix, fields) {
  return fields.map((f) => ({ ...f, key: `${prefix}.${f.key}` }));
}
var ID = {
  company: "co_sample",
  organizer: "org_sample",
  event: "SampleEvent01",
  ticket: "SampleTicket01",
  order: "SampleOrder01",
  attendee: "SampleOrderItem01.0",
  venue: "ven_sample"
};
var COSTS_HINT = "(e.g. USD,5500)";
var address = (key, label) => [
  o(key, label),
  s(`${key}.address_1`, `${label} line 1`),
  s(`${key}.city`, `${label} city`),
  s(`${key}.region`, `${label} region`),
  s(`${key}.postal_code`, `${label} postal code`),
  s(`${key}.country`, `${label} country`)
];
var location = (key, label) => [
  o(key, label),
  s(`${key}.name`, `${label} name`),
  s(`${key}.venueId`, `${label} venue ID`),
  s(`${key}.timezone`, `${label} timezone`),
  ...address(`${key}.address`, `${label} address`),
  s(`${key}.address.formattedAddress`, `${label} formatted address`)
];
var LOCATION_SAMPLE = {
  name: "The Example Room",
  venueId: ID.venue,
  timezone: "America/New_York",
  address: {
    address_1: "100 Example St",
    city: "Baltimore",
    region: "MD",
    postal_code: "21230",
    country: "US",
    formattedAddress: "100 Example St Baltimore MD US 21230"
  }
};
var TICKET_OUTPUT = [
  s("id", "Ticket ID"),
  s("name", "Name"),
  s("type", "Type (admission, package, \u2026)"),
  s("status", "Status (live, hidden, sold-out, \u2026)"),
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
  s("changed", "Changed (UTC)")
];
var TICKET_SAMPLE = {
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
    total: "USD,2775"
  },
  created: "2026-10-01T15:00:00.000Z",
  changed: "2026-10-20T18:30:00.000Z"
};
var EVENT_OUTPUT = [
  s("id", "Event ID"),
  s("name", "Name"),
  s("summary", "Summary"),
  s("slug", "Slug"),
  s("status", "Status (draft, live, \u2026)"),
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
  a("channels", "Channels")
];
var EVENT_SAMPLE = {
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
  channels: []
};
var ORDER_ITEM_FIELDS = [
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
  s("offering.description", "Ticket description (HTML)")
];
var TRANSACTION_FIELDS = [
  s("provider", "Provider (authnet, stripe)"),
  s("status", "Status (approved, declined, \u2026)"),
  s("transId", "Provider transaction ID"),
  n("amount", "Amount (minor units)"),
  s("currency", "Currency"),
  s("created", "Created (UTC)"),
  s("contextId", "Context ID"),
  o("paymentMethod", "Payment method"),
  s("paymentMethod.type", "Payment method type")
];
var ORDER_OUTPUT = [
  s("id", "Order ID"),
  s("orderNumber", "Order number"),
  s("status", "Status (placed, refunded, \u2026)"),
  s("currency", "Currency"),
  s("companyId", "Company ID"),
  s("organizerId", "Organizer ID"),
  s("contextId", "Event context ID (evt_\u2026)"),
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
  ...location("meta.resolvedContext.location", "Event location")
];
var ORDER_SAMPLE = {
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
    total: "USD,5845"
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
      country: "US"
    }
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
        total: "USD,5550"
      },
      offering: {
        id: ID.ticket,
        name: "General Admission",
        type: "admission",
        category: "General Admission",
        description: "<ul><li>Admission for one guest</li></ul>"
      }
    }
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
      location: LOCATION_SAMPLE
    }
  }
};
var ORDER_DETAILS_OUTPUT = [
  o("order", "Order"),
  ...prefixOutput("order", ORDER_OUTPUT),
  o("organizer", "Organizer (currently always null)"),
  o("transaction", "Transaction (currently always null)"),
  a("transactions", "Payment transactions", TRANSACTION_FIELDS)
];
var ORDER_DETAILS_SAMPLE = {
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
      paymentMethod: { type: "card" }
    }
  ]
};
var ATTENDEE_OUTPUT = [
  s("id", "Attendee ID"),
  s("orderId", "Order ID"),
  s("orderNumber", "Order number"),
  s("orderItemId", "Order item ID"),
  n("index", "Index within the order item"),
  s("offeringId", "Ticket ID"),
  s("status", "Status (attending, \u2026)"),
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
  s("offeringSnapshot.type", "Ticket type (admission, \u2026)"),
  s("offeringSnapshot.category", "Ticket category"),
  s("created", "Created (UTC)"),
  s("changed", "Changed (UTC)")
];
var ATTENDEE_SAMPLE = {
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
    phone: "+15555550100"
  },
  offeringSnapshot: {
    id: ID.ticket,
    name: "General Admission",
    type: "admission",
    category: "General"
  },
  created: "2026-11-01T20:34:09.000Z",
  changed: "2026-11-01T20:34:09.000Z"
};
function payloadOutput(dataLabel, dataFields, extraMeta = []) {
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
    ...extraMeta
  ];
}
function payloadSample(action, resourcePath, data, changedFields, extraMeta = {}) {
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
      ...extraMeta
    }
  };
}
var ORDER_TRIGGER_OUTPUT = payloadOutput("Order", ORDER_OUTPUT, [
  a("meta.transactions", "Payment transactions", TRANSACTION_FIELDS)
]);
function orderTriggerSample(action, changedFields = []) {
  return payloadSample(action, `/orders/${ID.order}`, ORDER_SAMPLE, changedFields, {
    transactions: ORDER_DETAILS_SAMPLE.transactions
  });
}
var EVENT_CHANGED_OUTPUT = payloadOutput("Event", EVENT_OUTPUT);
var EVENT_CHANGED_SAMPLE = payloadSample("event.updated", `/events/${ID.event}`, EVENT_SAMPLE, [
  "name",
  "start"
]);
var TICKET_CHANGED_OUTPUT = payloadOutput("Ticket", TICKET_OUTPUT);
var TICKET_CHANGED_SAMPLE = payloadSample(
  "offering.updated",
  `/events/${ID.event}/tickets/${ID.ticket}`,
  TICKET_SAMPLE,
  ["costs", "costs.tax", "costs.total", "changed"]
);
var ATTENDEE_CHANGED_OUTPUT = payloadOutput("Attendee", ATTENDEE_OUTPUT);
var ATTENDEE_CHANGED_SAMPLE = payloadSample(
  "attendee.created",
  `/events/${ID.event}/attendees/${ID.attendee}`,
  ATTENDEE_SAMPLE,
  []
);
var CHANNEL_OUTPUT = [
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
  s("changed", "Changed (UTC)")
];
var CHANNEL_LISTED_EVENT_OUTPUT = [
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
  b("listing.orphaned", "Orphaned (the event is no longer live, so the channel does not show it)")
];
var CHANNEL_LISTING_OUTPUT = [
  s("eventId", "Event ID"),
  s("channelId", "Channel ID"),
  s("listingId", "Listing ID (primary, or an extra listing's id)"),
  s("slug", "Listing slug"),
  o("properties", "Listing properties")
];
var CHANNEL_EVENT_OUTPUT = [
  ...EVENT_OUTPUT,
  a("contentBlocks", 'Content blocks (the "description" block holds the description on the channel)'),
  b("salesEnabled", "Ticket sales on (false while the organizer has paused them on the channel)")
];
var CHANNEL_EVENT_SAMPLE = {
  ...EVENT_SAMPLE,
  name: "Friday Night Social \u2014 on Sample Channel",
  contentBlocks: [
    {
      id: "details",
      type: "richtext",
      designation: "description",
      title: "Details",
      status: "live",
      order: 1,
      data: { content: { html: "<p>Live DJs, a welcome drink and a packed room.</p>" } }
    }
  ],
  salesEnabled: true
};
var CHANNEL_TICKET_OUTPUT = TICKET_OUTPUT.filter(
  (f) => f.key !== "capacity" && f.key !== "quantitySold"
).map(
  (f) => f.key === "status" ? { ...f, label: "Status (live, sold-out; unavailable while sales on the channel are paused)" } : f.key === "costs.cost" ? { ...f, label: `Price on the channel ${COSTS_HINT}` } : f
);
var { capacity: _capacity, quantitySold: _sold, ...CHANNEL_TICKET_SAMPLE_BASE } = TICKET_SAMPLE;
var CHANNEL_TICKET_SAMPLE = {
  ...CHANNEL_TICKET_SAMPLE_BASE,
  costs: { ...TICKET_SAMPLE.costs, cost: "USD,2750", gross: "USD,3025", total: "USD,3025" }
};
var CHANNEL_EVENT_CHANGED_OUTPUT = [
  ...payloadOutput("The event as the channel shows this listing", CHANNEL_EVENT_OUTPUT).map(
    (f) => f.key === "type" ? { ...f, label: "Type (channelEvent)" } : f.key === "meta.changedFields" ? { ...f, label: "Changed fields (e.g. event.name, tickets.<id>.costs, customization)" } : f
  ),
  s("meta.channelId", "Channel ID"),
  s("meta.listingId", "Listing ID (primary, or an extra listing's id)"),
  o("meta.properties", "Listing properties (values your channel keeps on this listing, e.g. a synced id)")
];
var CHANNEL_EVENT_CHANGED_SAMPLE = {
  ...payloadSample(
    "channelEvent.changed",
    `/channels/ch_sample/events/${ID.event}/listings/primary`,
    CHANNEL_EVENT_SAMPLE,
    ["tickets.SampleTicket01.costs"],
    { channelId: "ch_sample", listingId: "primary", properties: { eventbriteId: "1234567890" } }
  ),
  type: "channelEvent",
  id: ID.event
};
var OBJECT_CHANGED_OUTPUT = payloadOutput(
  "The object (fields depend on type; same as its get-* action)",
  [s("id", "Object ID")]
);
var OBJECT_CHANGED_SAMPLE = payloadSample(
  "offering.updated",
  `/events/${ID.event}/tickets/${ID.ticket}`,
  { id: ID.ticket },
  ["capacity"]
);
var CHANNEL_CHANGED_OUTPUT = [
  ...payloadOutput("The channel listing (event.change) or the ticket (ticket.change)", []).map(
    (f) => f.key === "action" ? { ...f, label: "Action (event.change | ticket.change)", enum: ["event.change", "ticket.change"] } : f.key === "type" ? { ...f, label: "Type (channelEvent | offering)" } : f.key === "id" ? { ...f, label: "Event ID (event.change) or ticket ID (ticket.change)" } : f
  ),
  s("meta.channelId", "Channel ID"),
  s("meta.change", "What happened (listed|changed|unlisted|created|updated|deleted)"),
  s("meta.ticketId", "Ticket ID (ticket.change only)"),
  s("meta.listingId", "Listing ID (event.change only)"),
  o("meta.properties", "Listing properties (event.change only)")
];
var CHANNEL_CHANGED_SAMPLE = {
  ...payloadSample(
    "channelEvent.changed",
    `/channels/ch_sample/events/${ID.event}/listings/primary`,
    CHANNEL_EVENT_SAMPLE,
    [],
    { channelId: "ch_sample", change: "changed", ticketId: null, listingId: "primary", properties: { eventbriteId: "1234567890" } }
  ),
  action: "event.change",
  type: "channelEvent",
  id: ID.event
};

// lib/payload.ts
async function fetchObject(client, type, id, eventId) {
  const enc = encodeURIComponent;
  switch (type) {
    case "event":
      return { data: await client.request(`/events/${enc(id)}`) };
    case "offering":
      return { data: eventId ? await client.request(`/events/${enc(eventId)}/tickets/${enc(id)}`) : null };
    case "attendee":
      return { data: eventId ? await client.request(`/events/${enc(eventId)}/attendees/${enc(id)}`) : null };
    case "order": {
      const details = await client.request(`/orders/${enc(id)}`);
      const order = details && typeof details === "object" && "order" in details ? details.order : details;
      return { data: order ?? null, transactions: details?.transactions ?? [] };
    }
    default:
      return { data: null };
  }
}
async function toPayload(raw, ctx) {
  const ping = pingOf(raw);
  const dot = ping.action.indexOf(".");
  const type = dot > 0 ? ping.action.slice(0, dot) : ping.action;
  const what = dot > 0 ? ping.action.slice(dot + 1) : "";
  const segments = ping.context.resourcePath.split("/").filter(Boolean);
  const id = segments[segments.length - 1];
  let eventId = segments[0] === "events" && segments[1] ? segments[1] : null;
  const { data, transactions } = what === "deleted" ? { data: null, transactions: type === "order" ? [] : void 0 } : await fetchObject(new CohostClient(ctx), type, id, eventId);
  const contextId = type === "order" ? data?.contextId : void 0;
  if (!eventId && typeof contextId === "string" && contextId.startsWith("evt_")) eventId = contextId.slice(4);
  return {
    urn: ping.urn,
    action: ping.action,
    type,
    id,
    timestamp: ping.timestamp,
    data,
    meta: {
      changedFields: ping.data?.changedFields ?? [],
      companyId: ping.context.companyId,
      eventId,
      resourcePath: ping.context.resourcePath,
      deliveryId: ping.id,
      ...transactions ? { transactions } : {}
    }
  };
}

// triggers/order-placed.ts
var orderPlaced = {
  key: "order-placed",
  title: "Order Placed",
  description: "Fires when a Cohost order is placed.",
  output: ORDER_TRIGGER_OUTPUT,
  sample: orderTriggerSample("order.placed"),
  onSubscribe({ callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: order placed", callbackUrl, ["order.placed"]);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var order_placed_default = orderPlaced;

// triggers/order-changed.ts
var orderChanged = {
  key: "order-changed",
  title: "Order Changed",
  description: "Fires when a Cohost order is changed.",
  output: ORDER_TRIGGER_OUTPUT,
  sample: orderTriggerSample("order.changed", ["status"]),
  onSubscribe({ callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: order changed", callbackUrl, ["order.changed"]);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var order_changed_default = orderChanged;

// triggers/order-confirmation-requested.ts
var orderConfirmationRequested = {
  key: "order-confirmation-requested",
  title: "Order Confirmation Requested",
  description: "Fires when Cohost determines an order confirmation email is due.",
  output: ORDER_TRIGGER_OUTPUT,
  sample: orderTriggerSample("order.confirmation-requested"),
  onSubscribe({ callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: order confirmation requested", callbackUrl, ["order.confirmation-requested"]);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var order_confirmation_requested_default = orderConfirmationRequested;

// triggers/event-changed.ts
var ACTIONS = ["created", "updated", "deleted", "published"];
var DEFAULT_ACTIONS = ["created", "updated", "deleted"];
var eventChanged = {
  key: "event-changed",
  title: "Event Changed",
  description: "Fires when a Cohost event is created, updated, deleted or published.",
  params: [
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for created, updated and deleted.",
      default: [...DEFAULT_ACTIONS],
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" },
        { value: "published", label: "Published" }
      ]
    }
  ],
  output: EVENT_CHANGED_OUTPUT,
  sample: EVENT_CHANGED_SAMPLE,
  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS, DEFAULT_ACTIONS).map((a2) => `event.${a2}`);
    return subscribeWebhook(ctx, "w6w: event changed", callbackUrl, events);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var event_changed_default = eventChanged;

// triggers/ticket-changed.ts
var ACTIONS2 = ["created", "updated", "deleted"];
var ticketChanged = {
  key: "ticket-changed",
  title: "Ticket Changed",
  description: "Fires when a ticket on a Cohost event is created, updated or deleted.",
  params: [
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...ACTIONS2],
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" }
      ]
    }
  ],
  output: TICKET_CHANGED_OUTPUT,
  sample: TICKET_CHANGED_SAMPLE,
  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS2, ACTIONS2).map((a2) => `offering.${a2}`);
    return subscribeWebhook(ctx, "w6w: ticket changed", callbackUrl, events);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var ticket_changed_default = ticketChanged;

// lib/channel-event.ts
function fetchChannelEvent(ctx, ref) {
  return new CohostClient(ctx).request(`/events/${encodeURIComponent(ref.eventId)}`, {
    query: { listingId: ref.listingId?.trim() },
    headers: { "x-cohost-channel-id": ref.channelId }
  });
}
function isCohostNotFound(error) {
  return error instanceof Error && /^Cohost 404 /.test(error.message);
}
function fetchChannelEventTickets(ctx, ref) {
  return new CohostClient(ctx).request(`/events/${encodeURIComponent(ref.eventId)}/tickets`, {
    query: { listingId: ref.listingId?.trim() },
    headers: { "x-cohost-channel-id": ref.channelId }
  });
}
function notShownOnChannel(ref) {
  const listing = ref.listingId?.trim() && ref.listingId.trim() !== "primary" ? ` (listing ${ref.listingId.trim()})` : "";
  return new Error(
    `Event ${ref.eventId}${listing} is not shown on channel ${ref.channelId}: not listed there, hidden, or not live`
  );
}

// lib/channels.ts
var CHANNEL_TYPES = ["website", "social", "promoter", "affiliate", "api", "seller", "other"];
var CHANNEL_TYPE_OPTIONS = CHANNEL_TYPES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1)
}));
var MAX_CHANNEL_OPTIONS = 1e3;
var channelIdParam = (extra = {}) => ({
  key: "channelId",
  label: "Channel",
  type: "string",
  options: { source: "resolveFields" },
  config: { allowCustom: true },
  ...extra
});
var channelOptions = (channels) => {
  const rows = Array.isArray(channels) ? channels : Array.isArray(channels?.results) ? channels.results : [];
  return rows.filter((c) => typeof c === "object" && c !== null && typeof c.id === "string").map((c) => {
    const id = c.id;
    const name = typeof c.name === "string" && c.name.trim() ? c.name.trim() : id;
    const inactive = c.status === "inactive";
    const detail = [typeof c.type === "string" ? c.type : "", inactive ? "inactive" : "", id].filter(Boolean);
    return { option: { value: id, label: name, description: detail.join(" \xB7 ") }, inactive };
  }).sort((a2, b2) => Number(a2.inactive) - Number(b2.inactive) || a2.option.label.localeCompare(b2.option.label)).slice(0, MAX_CHANNEL_OPTIONS).map(({ option }) => option);
};
var resolveChannelFields = async (input, ctx) => {
  if (!input.fields.includes("channelId")) return { fields: {} };
  try {
    const channels = await new CohostClient(ctx).request("/company/sales-channels");
    return { fields: { channelId: { options: channelOptions(channels) } } };
  } catch (error) {
    return { fields: { channelId: { error: error instanceof Error ? error.message : String(error) } } };
  }
};
var channelPath = (channelId, ...rest) => ["/company/sales-channels", channelId, ...rest].map((part, i) => i === 0 ? part : encodeURIComponent(part.trim())).join("/");
var DEFAULT_PRICING_PARAMS = [
  {
    key: "pricingFormulaId",
    label: "Default price formula ID",
    type: "string",
    hint: "Optional. Prices your own events' listings on the channel that set no formula or markup of their own. Replaces the default markup."
  },
  {
    key: "pricingMarkupPercent",
    label: "Default markup %",
    type: "number",
    hint: "Optional. Used when no default price formula is given; 0 means no default."
  }
];
var defaultPricingOf = (input) => {
  const formulaId = input.pricingFormulaId?.trim();
  if (formulaId) return { formulaId };
  if (input.pricingMarkupPercent === void 0 || input.pricingMarkupPercent === "") return void 0;
  const markupPercent = Number(input.pricingMarkupPercent);
  if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1e3) {
    throw new Error("Default markup % must be a number from 0 to 1000");
  }
  return markupPercent === 0 ? null : { markupPercent };
};

// triggers/channel-event-changed.ts
var ACTIONS3 = ["listed", "changed", "unlisted"];
var DEFAULT_ACTIONS2 = ["listed", "changed", "unlisted"];
function parseListingPath(resourcePath) {
  const [channels, channelId, events, eventId, listings, listingId, ...rest] = resourcePath.split("/").filter(Boolean);
  if (channels !== "channels" || events !== "events" || listings !== "listings" || rest.length > 0) return null;
  if (!channelId || !eventId || !listingId) return null;
  return {
    channelId: decodeURIComponent(channelId),
    eventId: decodeURIComponent(eventId),
    listingId: decodeURIComponent(listingId)
  };
}
var channelEventChanged = {
  key: "channel-event-changed",
  title: "Channel Event Changed",
  description: "Fires when an event is listed on, changes on, or is unlisted from one of your sales channels.",
  params: [
    channelIdParam({ hint: "Only this channel's listings. Leave empty for all of your channels." }),
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...DEFAULT_ACTIONS2],
      options: [
        { value: "listed", label: "Listed" },
        { value: "changed", label: "Changed" },
        { value: "unlisted", label: "Unlisted" }
      ]
    }
  ],
  output: CHANNEL_EVENT_CHANGED_OUTPUT,
  sample: CHANNEL_EVENT_CHANGED_SAMPLE,
  // The Channel picker. Declared the way an Action declares it; w6w runs it once it serves
  // trigger forms too (see `TriggerDefinition.resolveFields`).
  resolveFields: resolveChannelFields,
  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS3, DEFAULT_ACTIONS2).map((a2) => `channelEvent.${a2}`);
    return subscribeWebhook(ctx, "w6w: channel event changed", callbackUrl, events);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw, params }, ctx) {
    const ping = pingOf(raw);
    const listing = parseListingPath(ping.context.resourcePath);
    if (!listing) return [];
    const channelFilter = typeof params.channelId === "string" ? params.channelId.trim() : "";
    if (channelFilter && channelFilter !== listing.channelId) return [];
    let data = null;
    if (ping.action !== "channelEvent.unlisted") {
      try {
        data = await fetchChannelEvent(ctx, listing);
      } catch (error) {
        if (!isCohostNotFound(error)) throw error;
      }
    }
    return [{
      urn: ping.urn,
      action: ping.action,
      type: "channelEvent",
      id: listing.eventId,
      timestamp: ping.timestamp,
      data: data ?? null,
      meta: {
        changedFields: ping.data?.changedFields ?? [],
        companyId: ping.context.companyId,
        eventId: listing.eventId,
        resourcePath: ping.context.resourcePath,
        deliveryId: ping.id,
        channelId: listing.channelId,
        listingId: listing.listingId,
        properties: ping.data?.properties ?? {}
      }
    }];
  }
};
var channel_event_changed_default = channelEventChanged;

// triggers/channel-changed.ts
var ACTIONS4 = ["event.change", "ticket.change"];
function eventIdOf(resourcePath) {
  const [events, eventId] = resourcePath.split("/").filter(Boolean);
  if (events !== "events" || !eventId) return null;
  try {
    return decodeURIComponent(eventId);
  } catch {
    return null;
  }
}
var channelChanged = {
  key: "channel-changed",
  title: "Channel Changed",
  description: "Fires when something changes on one of your sales channels: an event is listed, changed or unlisted (event.change), or a ticket of a listed event changes (ticket.change).",
  params: [
    channelIdParam({ required: true, hint: "Only changes on this channel." }),
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...ACTIONS4],
      options: [
        { value: "event.change", label: "Event change" },
        { value: "ticket.change", label: "Ticket change" }
      ]
    }
  ],
  output: CHANNEL_CHANGED_OUTPUT,
  sample: CHANNEL_CHANGED_SAMPLE,
  resolveFields: resolveChannelFields,
  async onSubscribe({ params, callbackUrl }, ctx) {
    if (typeof params.channelId !== "string" || !params.channelId.trim()) {
      throw new Error("channelId: required \u2014 pick the sales channel to watch");
    }
    const picked = pickValues("actions", params.actions, ACTIONS4, ACTIONS4);
    const events = [
      ...picked.includes("event.change") ? ["listed", "changed", "unlisted"].map((a2) => `channelEvent.${a2}`) : [],
      ...picked.includes("ticket.change") ? ["created", "updated", "deleted"].map((a2) => `offering.${a2}`) : []
    ];
    return subscribeWebhook(ctx, "w6w: channel changed", callbackUrl, events);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw, params }, ctx) {
    const channelId = typeof params.channelId === "string" ? params.channelId.trim() : "";
    if (!channelId) throw new Error("channelId: required");
    const ping = pingOf(raw);
    const change = ping.action.slice(ping.action.indexOf(".") + 1);
    if (ping.action.startsWith("channelEvent.")) {
      const listing = parseListingPath(ping.context.resourcePath);
      if (!listing || listing.channelId !== channelId) return [];
      let data = null;
      if (ping.action !== "channelEvent.unlisted") {
        try {
          data = await fetchChannelEvent(ctx, listing);
        } catch (error) {
          if (!isCohostNotFound(error)) throw error;
        }
      }
      return [{
        urn: ping.urn,
        action: "event.change",
        type: "channelEvent",
        id: listing.eventId,
        timestamp: ping.timestamp,
        data: data ?? null,
        meta: {
          changedFields: ping.data?.changedFields ?? [],
          companyId: ping.context.companyId,
          eventId: listing.eventId,
          resourcePath: ping.context.resourcePath,
          deliveryId: ping.id,
          channelId,
          change,
          listingId: listing.listingId,
          properties: ping.data?.properties ?? {}
        }
      }];
    }
    if (ping.action.startsWith("offering.")) {
      const eventId = eventIdOf(ping.context.resourcePath);
      if (!eventId) return [];
      let listed;
      try {
        const rows = await new CohostClient(ctx).request(channelPath(channelId, "events", eventId, "listings"));
        listed = Array.isArray(rows) && rows.length > 0;
      } catch (error) {
        if (!isCohostNotFound(error)) throw error;
        listed = false;
      }
      if (!listed) return [];
      const payload = await toPayload(raw, ctx);
      return [{
        ...payload,
        action: "ticket.change",
        meta: { ...payload.meta, channelId, eventId, change, ticketId: payload.id }
      }];
    }
    return [];
  }
};
var channel_changed_default = channelChanged;

// triggers/attendee-changed.ts
var ACTIONS5 = ["created", "checked_in", "deleted"];
var DEFAULT_ACTIONS3 = ["created"];
var attendeeChanged = {
  key: "attendee-changed",
  title: "Attendee Changed",
  description: "Fires when a Cohost attendee is created (one per ticket on a placed order), checked in or deleted.",
  params: [
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for Created only.",
      default: [...DEFAULT_ACTIONS3],
      options: [
        { value: "created", label: "Created" },
        { value: "checked_in", label: "Checked in" },
        { value: "deleted", label: "Deleted" }
      ]
    }
  ],
  output: ATTENDEE_CHANGED_OUTPUT,
  sample: ATTENDEE_CHANGED_SAMPLE,
  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS5, DEFAULT_ACTIONS3).map((a2) => `attendee.${a2}`);
    return subscribeWebhook(ctx, "w6w: attendee changed", callbackUrl, events);
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var attendee_changed_default = attendeeChanged;

// triggers/object-changed.ts
var EVENTS = {
  event: ["created", "updated", "deleted", "published"],
  offering: ["created", "updated", "deleted"],
  order: ["created", "updated", "placed", "refunded"],
  attendee: ["created", "deleted", "checked_in"]
};
var TYPES = Object.keys(EVENTS);
var ACTIONS6 = [...new Set(Object.values(EVENTS).flat())];
var DEFAULT_ACTIONS4 = ["created", "updated", "deleted"];
function webhookEvents(params) {
  const types = pickValues("types", params.types, TYPES, TYPES);
  const actions = pickValues("actions", params.actions, ACTIONS6, DEFAULT_ACTIONS4);
  const events = types.flatMap((t) => actions.filter((a2) => EVENTS[t].includes(a2)).map((a2) => `${t}.${a2}`));
  if (events.length === 0) {
    throw new TypeError(`Cohost emits none of ${actions.join(", ")} for ${types.join(", ")}.`);
  }
  return events;
}
var objectChanged = {
  key: "object-changed",
  title: "Object Changed",
  description: "Fires when a Cohost event, ticket, order or attendee changes.",
  params: [
    {
      key: "types",
      label: "Types",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...TYPES],
      options: [
        { value: "event", label: "Event" },
        { value: "offering", label: "Ticket (offering)" },
        { value: "order", label: "Order" },
        { value: "attendee", label: "Attendee" }
      ]
    },
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for created, updated and deleted.",
      default: [...DEFAULT_ACTIONS4],
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" },
        { value: "published", label: "Published (events)" },
        { value: "placed", label: "Placed (orders)" },
        { value: "refunded", label: "Refunded (orders)" },
        { value: "checked_in", label: "Checked in (attendees)" }
      ]
    }
  ],
  output: OBJECT_CHANGED_OUTPUT,
  sample: OBJECT_CHANGED_SAMPLE,
  async onSubscribe({ params, callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: object changed", callbackUrl, webhookEvents(params));
  },
  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },
  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  }
};
var object_changed_default = objectChanged;

// lib/params.ts
var paginationParams = [
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "1-based page number.",
    validation: { integer: true, min: 1 }
  },
  {
    key: "size",
    label: "Page Size",
    type: "number",
    hint: "Results per page.",
    validation: { integer: true, min: 1 }
  }
];
var DEFAULT_PAGE_SIZE = 20;
var paginationQuery = (input) => ({
  page: input.page,
  size: input.size ?? (input.page === void 0 ? void 0 : DEFAULT_PAGE_SIZE)
});
var paginatedOutput = (label) => [
  { key: "results", type: "array", label },
  { key: "pagination.page", type: "number", label: "Page" },
  { key: "pagination.size", type: "number", label: "Page Size" },
  { key: "pagination.total", type: "number", label: "Total" }
];
var contextParam = {
  key: "context",
  label: "Context",
  type: "json",
  hint: "Optional free-form context object forwarded verbatim to the API."
};
var eventOutput = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "summary", type: "string", label: "Summary" },
  { key: "status", type: "string", label: "Status" },
  { key: "start", type: "string", label: "Start" },
  { key: "end", type: "string", label: "End" },
  { key: "tz", type: "string", label: "Timezone" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "public", type: "boolean", label: "Public" },
  { key: "capacity", type: "number", label: "Capacity" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "organizerId", type: "string", label: "Organizer ID" },
  { key: "location", type: "object", label: "Location" },
  { key: "flyer", type: "object", label: "Flyer" }
];
var ticketOutput = [
  { key: "id", type: "string", label: "Ticket ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "category", type: "string", label: "Category" },
  { key: "status", type: "string", label: "Status" },
  { key: "priceCategory", type: "string", label: "Price Category" },
  { key: "capacity", type: "number", label: "Capacity" },
  { key: "quantitySold", type: "number", label: "Quantity Sold" },
  { key: "minimumQuantity", type: "number", label: "Minimum Quantity" },
  { key: "maximumQuantity", type: "number", label: "Maximum Quantity" },
  { key: "sorting", type: "number", label: "Sorting" }
];
var couponOutput = [
  { key: "id", type: "string", label: "Coupon ID" },
  { key: "code", type: "string", label: "Code" },
  { key: "discountType", type: "string", label: "Discount Type" },
  { key: "discountValue", type: "number", label: "Discount Value" },
  { key: "maxUses", type: "number", label: "Max Uses" },
  { key: "usedCount", type: "number", label: "Used Count" },
  { key: "expiresAt", type: "string", label: "Expires At" },
  { key: "status", type: "string", label: "Status" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "companyId", type: "string", label: "Company ID" }
];
var organizerOutput = [
  { key: "id", type: "string", label: "Organizer ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "headline", type: "string", label: "Headline" },
  { key: "bio", type: "string", label: "Bio" },
  { key: "followers", type: "number", label: "Followers" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "logo", type: "object", label: "Logo" },
  { key: "links", type: "array", label: "Links" },
  { key: "settings", type: "object", label: "Settings" }
];

// actions/list-events.ts
var listEvents = {
  key: "list-events",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "List Cohost events, paginated.",
  params: [
    ...paginationParams,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: "Optional key/value object appended to the query string."
    }
  ],
  output: paginatedOutput("Events"),
  async execute(input, ctx) {
    ctx.log("info", "listing events", { page: input.page, size: input.size });
    const client = new CohostClient(ctx);
    return client.request("/events", {
      query: { ...input.filters, ...paginationQuery(input) }
    });
  }
};
var list_events_default = listEvents;

// lib/resource-id.ts
function resourceId(value, collection) {
  if (!value.startsWith("urn:")) return value;
  const invalid = () => new Error(`Expected a ${collection} resource URN ending in /${collection}/<id>.`);
  const match = /^urn:1:[^:\s/]+:[^:\s/]+:(\/[^?#\s]+)$/.exec(value);
  if (!match) throw invalid();
  let segments;
  try {
    segments = match[1].slice(1).split("/").map(decodeURIComponent);
  } catch {
    throw invalid();
  }
  if (segments.length % 2 !== 0 || segments.some((segment) => !segment || segment === "." || segment === ".." || /[/\\\u0000-\u001f]/.test(segment)) || segments.at(-2) !== collection) {
    throw invalid();
  }
  return segments.at(-1);
}

// actions/get-event.ts
var getEvent = {
  key: "get-event",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a Cohost event by id or URN.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true }
  ],
  output: eventOutput,
  async execute(input, ctx) {
    ctx.log("info", "fetching event", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(resourceId(input.event, "events"))}`);
  }
};
var get_event_default = getEvent;

// actions/search-events.ts
var MAX_SIZE = 100;
var DEFAULT_SIZE = 20;
var searchEvents = {
  key: "search-events",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search Cohost events by text, paginated.",
  params: [
    { key: "q", label: "Query", type: "string", required: true, hint: "Free-text search term." },
    ...paginationParams
  ],
  output: paginatedOutput("Events"),
  async execute(input, ctx) {
    ctx.log("info", "searching events", { q: input.q });
    const { page = 1, size = DEFAULT_SIZE } = paginationQuery(input);
    const limit = Math.min(size, MAX_SIZE);
    const client = new CohostClient(ctx);
    const res = await client.request("/search", {
      query: { q: input.q, types: "event", limit, offset: (page - 1) * limit }
    });
    return {
      results: res.results.map(({ entityId, id: _indexRowId, ...hit }) => ({ ...hit, id: entityId })),
      pagination: { page, size: limit, total: res.total }
    };
  }
};
var search_events_default = searchEvents;

// actions/create-event.ts
var createEvent = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a Cohost event.",
  idempotent: false,
  params: [
    {
      key: "event",
      label: "Event",
      type: "json",
      required: true,
      hint: 'Event fields, e.g. { "name": "Summer Concert", "start": "2026-07-15T19:00:00Z" }.'
    },
    contextParam
  ],
  output: [{ key: "id", type: "string", label: "Event ID" }],
  async execute(input, ctx) {
    ctx.log("info", "creating event");
    const client = new CohostClient(ctx);
    return client.request("/events", {
      method: "POST",
      body: { event: input.event, context: input.context }
    });
  }
};
var create_event_default = createEvent;

// actions/update-event.ts
var updateEvent = {
  key: "update-event",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Partially update a Cohost event.",
  idempotent: true,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Partial event fields, e.g. { "capacity": 5000 }.'
    },
    contextParam
  ],
  output: [{ key: "id", type: "string", label: "Event ID" }],
  async execute(input, ctx) {
    ctx.log("info", "updating event", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}`, {
      method: "PATCH",
      body: { event: input.patch, context: input.context }
    });
  }
};
var update_event_default = updateEvent;

// actions/get-event-blocks.ts
var getEventBlocks = {
  key: "get-event-blocks",
  type: "read",
  resource: "event",
  title: "Get Event Content Blocks",
  description: "Fetch the content blocks of a Cohost event, in display order.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true }
  ],
  output: [{ key: "blocks", type: "array", label: "Content Blocks" }],
  async execute(input, ctx) {
    ctx.log("info", "fetching event blocks", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(resourceId(input.event, "events"))}/blocks`);
  }
};
var get_event_blocks_default = getEventBlocks;

// actions/list-event-attendees.ts
var listEventAttendees = {
  key: "list-event-attendees",
  type: "read",
  resource: "attendee",
  title: "List Event Attendees",
  description: "List attendees on a Cohost event, paginated. Requires authentication.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    ...paginationParams,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: "Optional key/value object appended to the query string."
    }
  ],
  output: paginatedOutput("Attendees"),
  async execute(input, ctx) {
    ctx.log("info", "listing event attendees", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(resourceId(input.event, "events"))}/attendees`, {
      query: { ...input.filters, ...paginationQuery(input) }
    });
  }
};
var list_event_attendees_default = listEventAttendees;

// actions/get-event-attendee.ts
var getEventAttendee = {
  key: "get-event-attendee",
  type: "read",
  resource: "attendee",
  title: "Get Event Attendee",
  description: "Fetch one attendee on a Cohost event by id or URN.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "attendee", label: "Attendee (ID or URN)", type: "string", required: true }
  ],
  output: ATTENDEE_OUTPUT,
  async execute(input, ctx) {
    ctx.log("info", "fetching event attendee", { event: input.event, attendee: input.attendee });
    const client = new CohostClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(resourceId(input.event, "events"))}/attendees/${encodeURIComponent(resourceId(input.attendee, "attendees"))}`
    );
  }
};
var get_event_attendee_default = getEventAttendee;

// actions/list-event-tickets.ts
var listEventTickets = {
  key: "list-event-tickets",
  type: "read",
  resource: "ticket",
  title: "List Event Tickets",
  description: "List the ticket types on a Cohost event.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true }
  ],
  output: [{ key: "results", type: "array", label: "Tickets" }],
  async execute(input, ctx) {
    ctx.log("info", "listing event tickets", { event: input.event });
    const client = new CohostClient(ctx);
    const results = await client.request(
      `/events/${encodeURIComponent(resourceId(input.event, "events"))}/tickets`
    );
    return { results };
  }
};
var list_event_tickets_default = listEventTickets;

// actions/get-event-ticket.ts
var getEventTicket = {
  key: "get-event-ticket",
  type: "read",
  resource: "ticket",
  title: "Get Event Ticket",
  description: "Fetch one ticket type on a Cohost event by id or URN.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "ticket", label: "Ticket (ID or URN)", type: "string", required: true }
  ],
  output: ticketOutput,
  async execute(input, ctx) {
    ctx.log("info", "fetching event ticket", { event: input.event, ticket: input.ticket });
    const client = new CohostClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(resourceId(input.event, "events"))}/tickets/${encodeURIComponent(resourceId(input.ticket, "tickets"))}`
    );
  }
};
var get_event_ticket_default = getEventTicket;

// actions/create-event-tickets.ts
var createEventTickets = {
  key: "create-event-tickets",
  type: "perform",
  resource: "ticket",
  title: "Create Event Tickets",
  description: "Create one or more ticket types on a Cohost event.",
  idempotent: false,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "tickets",
      label: "Ticket(s)",
      type: "json",
      required: true,
      hint: 'One ticket object or an array, e.g. [{ "name": "VIP", "capacity": 20 }].'
    },
    contextParam
  ],
  output: [{ key: "ids", type: "object", label: "Created Ticket IDs (by reference)" }],
  async execute(input, ctx) {
    const many = Array.isArray(input.tickets);
    ctx.log("info", "creating event tickets", { event: input.event, many });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}/tickets`, {
      method: "POST",
      body: many ? { tickets: input.tickets, context: input.context } : { ticket: input.tickets, context: input.context }
    });
  }
};
var create_event_tickets_default = createEventTickets;

// actions/update-event-ticket.ts
var updateEventTicket = {
  key: "update-event-ticket",
  type: "perform",
  resource: "ticket",
  title: "Update Event Ticket",
  description: "Partially update a ticket type on a Cohost event.",
  idempotent: true,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "ticket", label: "Ticket ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Partial ticket fields, e.g. { "capacity": 120 }.'
    },
    contextParam
  ],
  output: ticketOutput,
  async execute(input, ctx) {
    ctx.log("info", "updating event ticket", { event: input.event, ticket: input.ticket });
    const client = new CohostClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.event)}/tickets/${encodeURIComponent(input.ticket)}`,
      { method: "PATCH", body: { ticket: input.patch, context: input.context } }
    );
  }
};
var update_event_ticket_default = updateEventTicket;

// actions/set-channel-listing-properties.ts
var setChannelListingProperties = {
  key: "set-channel-listing-properties",
  type: "perform",
  resource: "channel",
  title: "Set Channel Listing Properties",
  description: "Set the values your sales channel keeps on an event's listing \u2014 e.g. the id an integration published it under.",
  idempotent: true,
  params: [
    channelIdParam({ required: true }),
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      required: true,
      hint: 'Keys your channel declares, e.g. { "eventbriteId": "1234567890" }. null clears one.'
    },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed)."
    }
  ],
  output: [
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "listingId", type: "string", label: "Listing ID" },
    { key: "slug", type: "string", label: "Listing slug" },
    { key: "properties", type: "object", label: "The listing's properties after the write" }
  ],
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const listingId = input.listingId?.trim() || "primary";
    if (!input.properties || typeof input.properties !== "object" || Array.isArray(input.properties)) {
      throw new Error('Properties must be an object, e.g. { "eventbriteId": "1234567890" }');
    }
    ctx.log("info", "setting channel listing properties", {
      channelId: input.channelId,
      eventId: input.eventId,
      listingId
    });
    return new CohostClient(ctx).request(
      `/company/sales-channels/${encodeURIComponent(input.channelId)}/events/${encodeURIComponent(input.eventId)}/listings/${encodeURIComponent(listingId)}/properties`,
      { method: "PATCH", body: { properties: input.properties } }
    );
  }
};
var set_channel_listing_properties_default = setChannelListingProperties;

// actions/assign-price-formula.ts
var ticketIds = (value) => [
  ...new Set(
    (value ?? "").split(/[\s,]+/).map((part) => part.trim()).filter(Boolean).map(
      (part) => part.startsWith("urn:") ? part.split("/").pop() ?? part : part
    )
  )
];
var assignPriceFormula = {
  key: "assign-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Assign Price Formula",
  description: "Price an event's tickets on a sales channel by one of your price formulas.",
  idempotent: true,
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "formulaId",
      label: "Formula ID",
      type: "string",
      hint: "Blank removes the formula from the tickets (or the listing), which fall back to the listing's pricing."
    },
    {
      key: "tickets",
      label: "Ticket IDs",
      type: "text",
      hint: "Comma or line separated, e.g. the GA and fast pass tickets. Blank sets the formula for the whole listing."
    },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed)."
    }
  ],
  output: [
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "listingId", type: "string", label: "Listing ID" },
    { key: "pricing.formulaId", type: "string", label: "The listing's formula" },
    { key: "pricing.formulas", type: "object", label: "Ticket ID \u2192 formula" },
    { key: "pricing.prices", type: "object", label: "Ticket ID \u2192 own channel price" },
    { key: "pricing.markupPercent", type: "number", label: "Markup %" }
  ],
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const eventId = resourceId(input.event.trim(), "events");
    const channelId = input.channelId.trim();
    const listingId = input.listingId?.trim() || "primary";
    const formulaId = input.formulaId?.trim() || void 0;
    const tickets = ticketIds(input.tickets);
    const path = `/events/${encodeURIComponent(eventId)}/channels/${encodeURIComponent(channelId)}/customization`;
    const query = listingId === "primary" ? void 0 : { listingId };
    const client = new CohostClient(ctx);
    const view = await client.request(path, { query });
    const current = view.customization ?? {};
    const pricing = { ...current.pricing ?? {} };
    const prices = { ...pricing.prices ?? {} };
    const formulas = { ...pricing.formulas ?? {} };
    if (tickets.length === 0) {
      if (formulaId) pricing.formulaId = formulaId;
      else delete pricing.formulaId;
    } else {
      for (const ticketId of tickets) {
        if (formulaId) {
          formulas[ticketId] = formulaId;
          delete prices[ticketId];
        } else {
          delete formulas[ticketId];
        }
      }
    }
    ctx.log("info", "assigning price formula", { eventId, channelId, listingId, formulaId, tickets: tickets.length });
    const saved = await client.request(path, {
      method: "PUT",
      query,
      body: { customization: { ...current, fees: current.fees ?? [], pricing: { ...pricing, prices, formulas } } }
    });
    return { eventId, channelId, listingId: saved.listingId ?? listingId, pricing: saved.customization?.pricing ?? null };
  }
};
var assign_price_formula_default = assignPriceFormula;

// lib/price-formulas.ts
var formulaPath = (formulaId) => formulaId === void 0 ? "/company/price-formulas" : `/company/price-formulas/${encodeURIComponent(formulaId.trim())}`;
var FORMULA_CURRENCY_OPTIONS = ["USD", "CAD", "EUR", "GBP", "AUD", "ILS"].map((value) => ({
  value,
  label: value
}));
var toAmount = (amount, currency) => {
  if (amount === void 0 || amount === null || Number.isNaN(Number(amount))) return void 0;
  const minor = Math.round(Number(amount) * 100);
  if (minor < 0) throw new Error("Amount cannot be negative");
  return minor > 0 ? `${(currency || "USD").trim().toUpperCase()},${minor}` : void 0;
};
var CAP_TYPE_OPTIONS = [
  { value: "none", label: "No cap" },
  { value: "amount", label: "At most an amount" },
  { value: "percent", label: "At most a percent of the price" }
];
var toCap = (type, cap, currency) => {
  if (type === "none") return {};
  const value = Number(cap);
  if (cap === void 0 || cap === null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Cap must be a number above 0 when the cap type is "${type}"`);
  }
  if (type === "percent") return { capPercent: value };
  return { capAmount: `${(currency || "USD").trim().toUpperCase()},${Math.round(value * 100)}` };
};
var PRICE_FORMULA_OUTPUT = [
  { key: "id", type: "string", label: "Formula ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "markupPercent", type: "number", label: "Markup %" },
  { key: "amount", type: "string", label: "Amount added (CUR,minor)" },
  { key: "capAmount", type: "string", label: "Cap: the most it adds (CUR,minor)" },
  { key: "capPercent", type: "number", label: "Cap: the most it adds, % of the price" },
  { key: "usage.events", type: "number", label: "Used on: events" },
  { key: "usage.listings", type: "number", label: "Used on: channel listings" },
  { key: "usage.tickets", type: "number", label: "Used on: tickets assigned it" },
  { key: "usage.channels", type: "number", label: "Used on: channels' default pricing" },
  { key: "created", type: "string", label: "Created" },
  { key: "changed", type: "string", label: "Changed" }
];
var ASSIGNMENT_OUTPUT = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "channelId", type: "string", label: "Channel ID" },
  { key: "listingId", type: "string", label: "Listing ID" },
  { key: "offeringIds", type: "array", label: "Ticket IDs assigned the formula" },
  { key: "listingWide", type: "boolean", label: "The listing's formula (prices its other tickets)" }
];
var PRICE_FORMULA_DETAIL_OUTPUT = [
  ...PRICE_FORMULA_OUTPUT,
  { key: "assignments", type: "array", label: "Where it is assigned", items: ASSIGNMENT_OUTPUT },
  {
    key: "channels",
    type: "array",
    label: "Channels whose default pricing it is",
    items: [
      { key: "channelId", type: "string", label: "Channel ID" },
      { key: "name", type: "string", label: "Channel name" }
    ]
  }
];

// actions/create-price-formula.ts
var createPriceFormula = {
  key: "create-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Create Price Formula",
  description: "Save a named pricing rule (markup %, plus an amount, optionally capped) to assign to tickets on channels.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "e.g. Eventbrite VIP" },
    {
      key: "currency",
      label: "Amount currency",
      type: "select",
      required: true,
      default: "USD",
      options: FORMULA_CURRENCY_OPTIONS,
      hint: "The amount is only added to tickets priced in this currency."
    },
    {
      key: "markupPercent",
      label: "Markup %",
      type: "number",
      validation: { min: 0, max: 1e3 },
      hint: "Raises the ticket price by this percent, e.g. 15."
    },
    {
      key: "amount",
      label: "Amount added",
      type: "number",
      validation: { min: 0 },
      hint: "Added after the markup, in major units, e.g. 10 for $10.00."
    },
    {
      key: "capType",
      label: "Cap",
      type: "select",
      default: "none",
      options: CAP_TYPE_OPTIONS,
      hint: "Limits what the markup and amount together add to a ticket."
    },
    {
      key: "cap",
      label: "Cap value",
      type: "number",
      validation: { min: 0 },
      hint: "For an amount cap, major units in the amount currency (100 for $100.00); for a percent cap, the percent (20)."
    },
    { key: "description", label: "Description", type: "text" }
  ],
  output: PRICE_FORMULA_OUTPUT,
  async execute(input, ctx) {
    const body = { name: input.name.trim(), markupPercent: Number(input.markupPercent ?? 0) };
    const amount = toAmount(input.amount, input.currency);
    if (amount) body.amount = amount;
    Object.assign(body, toCap(input.capType ?? "none", input.cap, input.currency));
    if (input.description?.trim()) body.description = input.description.trim();
    ctx.log("info", "creating price formula", { name: body.name });
    return new CohostClient(ctx).request(formulaPath(), { method: "POST", body });
  }
};
var create_price_formula_default = createPriceFormula;

// actions/delete-price-formula.ts
var deletePriceFormula = {
  key: "delete-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Delete Price Formula",
  description: "Delete a price formula no channel listing uses any more.",
  idempotent: true,
  params: [{ key: "formulaId", label: "Formula ID", type: "string", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Formula ID" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "deleting price formula", { formulaId: input.formulaId });
    await new CohostClient(ctx).request(formulaPath(input.formulaId), { method: "DELETE" });
    return { deleted: true, id: input.formulaId.trim() };
  }
};
var delete_price_formula_default = deletePriceFormula;

// actions/get-price-formula.ts
var getPriceFormula = {
  key: "get-price-formula",
  type: "read",
  resource: "price-formula",
  title: "Get Price Formula",
  description: "Get a price formula and every channel listing and ticket it prices.",
  params: [{ key: "formulaId", label: "Formula ID", type: "string", required: true }],
  output: PRICE_FORMULA_DETAIL_OUTPUT,
  async execute(input, ctx) {
    ctx.log("info", "getting price formula", { formulaId: input.formulaId });
    return new CohostClient(ctx).request(formulaPath(input.formulaId));
  }
};
var get_price_formula_default = getPriceFormula;

// actions/list-price-formulas.ts
var OUTPUT = [{ key: "results", type: "array", label: "Price formulas", items: PRICE_FORMULA_OUTPUT }];
var listPriceFormulas = {
  key: "list-price-formulas",
  type: "read",
  resource: "price-formula",
  title: "List Price Formulas",
  description: "List your company's price formulas, with how many events, listings and tickets use each.",
  params: [],
  output: OUTPUT,
  async execute(_input, ctx) {
    ctx.log("info", "listing price formulas");
    const results = await new CohostClient(ctx).request(formulaPath());
    return { results: results ?? [] };
  }
};
var list_price_formulas_default = listPriceFormulas;

// actions/update-price-formula.ts
var given = (value) => value !== void 0 && value !== null && value !== "";
var nextCap = (input, current, currency) => {
  const currentType = current.capPercent ? "percent" : current.capAmount ? "amount" : "none";
  const type = given(input.capType) ? input.capType : currentType;
  if (type === "none") {
    if (given(input.cap) && !given(input.capType)) throw new Error('Choose a cap type to set a cap value: "amount" or "percent"');
    return {};
  }
  if (given(input.cap)) return toCap(type, input.cap, currency);
  if (type !== currentType) throw new Error(`Cap value is required to switch the cap to "${type}"`);
  if (type === "percent") return { capPercent: current.capPercent };
  const minor = (current.capAmount ?? "").split(",")[1];
  return { capAmount: `${currency},${minor}` };
};
var updatePriceFormula = {
  key: "update-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Update Price Formula",
  description: "Change a price formula (markup, amount, cap) \u2014 every ticket it is assigned to is repriced at once.",
  idempotent: true,
  params: [
    { key: "formulaId", label: "Formula ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", hint: "Blank keeps the name." },
    {
      key: "markupPercent",
      label: "Markup %",
      type: "number",
      validation: { min: 0, max: 1e3 },
      hint: "Blank keeps the markup; 0 removes it."
    },
    {
      key: "amount",
      label: "Amount added",
      type: "number",
      validation: { min: 0 },
      hint: "Major units, e.g. 10 for $10.00. Blank keeps the amount; 0 removes it."
    },
    {
      key: "currency",
      label: "Amount currency",
      type: "select",
      options: FORMULA_CURRENCY_OPTIONS,
      hint: "Blank keeps the amount's currency (USD for a new amount)."
    },
    {
      key: "capType",
      label: "Cap",
      type: "select",
      options: CAP_TYPE_OPTIONS,
      hint: "Blank keeps the cap; No cap removes it."
    },
    {
      key: "cap",
      label: "Cap value",
      type: "number",
      validation: { min: 0 },
      hint: "Amount cap: major units (100 for $100.00); percent cap: the percent (20). Blank keeps the value."
    },
    { key: "description", label: "Description", type: "text", hint: "Blank keeps the description." }
  ],
  output: PRICE_FORMULA_DETAIL_OUTPUT,
  async execute(input, ctx) {
    const client = new CohostClient(ctx);
    const current = await client.request(formulaPath(input.formulaId));
    const [currentCurrency, currentMinor] = (current.amount ?? "").split(",");
    const body = {
      name: input.name?.trim() || current.name,
      markupPercent: input.markupPercent ?? current.markupPercent ?? 0
    };
    const currency = input.currency?.trim() || currentCurrency || current.capAmount?.split(",")[0] || "USD";
    const amount = input.amount !== void 0 && input.amount !== null ? toAmount(input.amount, currency) : currentMinor ? `${currency},${currentMinor}` : void 0;
    if (amount) body.amount = amount;
    Object.assign(body, nextCap(input, current, currency));
    const description = input.description?.trim() || current.description;
    if (description) body.description = description;
    ctx.log("info", "updating price formula", { formulaId: input.formulaId });
    return client.request(formulaPath(input.formulaId), { method: "PUT", body });
  }
};
var update_price_formula_default = updatePriceFormula;

// actions/list-channels.ts
var OUTPUT2 = [{ key: "results", type: "array", label: "Channels", items: CHANNEL_OUTPUT }];
var listChannels = {
  key: "list-channels",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "List the sales channels your company owns.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: CHANNEL_TYPE_OPTIONS,
      hint: "Optional. Only channels of this type."
    }
  ],
  output: OUTPUT2,
  async execute(input, ctx) {
    ctx.log("info", "listing channels", { type: input.type });
    const results = await new CohostClient(ctx).request("/company/sales-channels", {
      query: { type: input.type }
    });
    return { results };
  }
};
var list_channels_default = listChannels;

// actions/get-channel.ts
var getChannel = {
  key: "get-channel",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Fetch one of your sales channels by id.",
  params: [channelIdParam({ required: true })],
  output: CHANNEL_OUTPUT,
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    ctx.log("info", "fetching channel", { channelId: input.channelId });
    return new CohostClient(ctx).request(channelPath(input.channelId));
  }
};
var get_channel_default = getChannel;

// actions/create-channel.ts
var createChannel = {
  key: "create-channel",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a sales channel for your company.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "type", label: "Type", type: "select", required: true, default: "website", options: CHANNEL_TYPE_OPTIONS },
    { key: "description", label: "Description", type: "text" },
    {
      key: "isPublic",
      label: "Public in the marketplace",
      type: "boolean",
      default: false,
      hint: "Other organizers can find the channel and apply to list their events on it. Needs the channel's marketplace branding first: a logo and a brand color (fields: logo, brandColor)."
    },
    ...DEFAULT_PRICING_PARAMS,
    {
      key: "fields",
      label: "Other fields",
      type: "json",
      hint: 'Optional. Any other channel fields, e.g. { "tags": ["nightlife"], "listingOptions": { "allowFees": true } }.'
    }
  ],
  output: CHANNEL_OUTPUT,
  async execute(input, ctx) {
    const extra = input.fields && typeof input.fields === "object" && !Array.isArray(input.fields) ? input.fields : {};
    const channel = { ...extra, name: input.name.trim(), type: input.type };
    if (input.description?.trim()) channel.description = input.description.trim();
    if (input.isPublic !== void 0) channel.isPublic = input.isPublic;
    const pricing = defaultPricingOf(input);
    if (pricing) channel.pricing = pricing;
    ctx.log("info", "creating channel", { name: channel.name, type: channel.type });
    return new CohostClient(ctx).request("/company/sales-channels", { method: "POST", body: { channel } });
  }
};
var create_channel_default = createChannel;

// actions/update-channel.ts
var updateChannel = {
  key: "update-channel",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  description: "Change one of your sales channels; only the fields you fill in change.",
  idempotent: true,
  params: [
    channelIdParam({ required: true }),
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" }
      ]
    },
    {
      key: "isPublic",
      label: "Public in the marketplace",
      type: "boolean",
      hint: "Making it public (or asking to) needs the channel's marketplace branding first: a logo and a brand color."
    },
    ...DEFAULT_PRICING_PARAMS,
    {
      key: "clearPricing",
      label: "Clear the default pricing",
      type: "boolean",
      hint: "Drop the channel's default price formula or markup: its listings price at the event's own prices again."
    },
    {
      key: "changes",
      label: "Other changes",
      type: "json",
      hint: 'Optional. Any other channel fields, e.g. { "tags": ["nightlife"], "listingOptions": { "allowFees": true } }.'
    }
  ],
  output: CHANNEL_OUTPUT,
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const extra = input.changes && typeof input.changes === "object" && !Array.isArray(input.changes) ? input.changes : {};
    const channel = { ...extra };
    if (input.name?.trim()) channel.name = input.name.trim();
    if (input.description !== void 0 && input.description !== "") channel.description = input.description;
    if (input.status) channel.status = input.status;
    if (input.isPublic !== void 0) channel.isPublic = input.isPublic;
    const pricing = input.clearPricing ? null : defaultPricingOf(input);
    if (pricing !== void 0) channel.pricing = pricing;
    if (Object.keys(channel).length === 0) throw new Error("Nothing to change: fill in at least one field");
    ctx.log("info", "updating channel", { channelId: input.channelId, fields: Object.keys(channel) });
    return new CohostClient(ctx).request(channelPath(input.channelId), { method: "PUT", body: { channel } });
  }
};
var update_channel_default = updateChannel;

// actions/delete-channel.ts
var deleteChannel = {
  key: "delete-channel",
  type: "perform",
  resource: "channel",
  title: "Delete Channel",
  description: "Delete one of your sales channels.",
  idempotent: true,
  params: [channelIdParam({ required: true })],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Channel ID" }
  ],
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    ctx.log("info", "deleting channel", { channelId: input.channelId });
    await new CohostClient(ctx).request(channelPath(input.channelId), { method: "DELETE" });
    return { deleted: true, id: input.channelId.trim() };
  }
};
var delete_channel_default = deleteChannel;

// actions/list-channel-events.ts
var OUTPUT3 = [
  { key: "results", type: "array", label: "Events on the channel", items: CHANNEL_LISTED_EVENT_OUTPUT },
  { key: "total", type: "number", label: "Total events on the channel" }
];
var listChannelEvents = {
  key: "list-channel-events",
  type: "read",
  resource: "channel",
  title: "List Channel Events",
  description: "List the events listed on one of your sales channels.",
  params: [
    channelIdParam({ required: true }),
    { key: "status", label: "Event status", type: "string", hint: "Optional, comma-separated, e.g. live,ended." },
    {
      key: "activeAt",
      label: "Runs on date",
      type: "string",
      hint: "Optional YYYY-MM-DD: only events running on that date, in their own timezone."
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "start", label: "Start date" },
        { value: "priority", label: "Listing priority" }
      ]
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" }
      ]
    },
    { key: "limit", label: "Page size", type: "number", default: 20, hint: "1 to 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 }
  ],
  output: OUTPUT3,
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    ctx.log("info", "listing channel events", { channelId: input.channelId });
    const page = await new CohostClient(ctx).request(
      channelPath(input.channelId, "events"),
      {
        query: {
          status: input.status?.replace(/\s+/g, ""),
          activeAt: input.activeAt?.trim(),
          orderBy: input.orderBy,
          order: input.order,
          limit: input.limit,
          offset: input.offset
        }
      }
    );
    return { results: page.items ?? [], total: page.total ?? 0 };
  }
};
var list_channel_events_default = listChannelEvents;

// actions/list-channel-event-listings.ts
var OUTPUT4 = [{ key: "results", type: "array", label: "Listings", items: CHANNEL_LISTING_OUTPUT }];
var listChannelEventListings = {
  key: "list-channel-event-listings",
  type: "read",
  resource: "channel",
  title: "List Channel Event Listings",
  description: "List an event's listings on one of your sales channels, with the properties your channel keeps on each.",
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true }
  ],
  output: OUTPUT4,
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const eventId = resourceId(input.event, "events");
    ctx.log("info", "listing channel event listings", { channelId: input.channelId, eventId });
    const results = await new CohostClient(ctx).request(
      channelPath(input.channelId, "events", eventId, "listings")
    );
    return { results };
  }
};
var list_channel_event_listings_default = listChannelEventListings;

// actions/set-channel-event-visibility.ts
var setChannelEventVisibility = {
  key: "set-channel-event-visibility",
  type: "perform",
  resource: "channel",
  title: "Show or Hide Channel Event",
  description: "Show or hide an event on one of your sales channels, without removing it.",
  idempotent: true,
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      required: true,
      default: "hidden",
      options: [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" }
      ]
    }
  ],
  output: [
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "slug", type: "string", label: "Listing slug" },
    { key: "tags", type: "array", label: "Listing tags" },
    { key: "meta", type: "object", label: "Listing meta" }
  ],
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const eventId = resourceId(input.event, "events");
    ctx.log("info", "setting channel event visibility", { channelId: input.channelId, eventId, visibility: input.visibility });
    return new CohostClient(ctx).request(channelPath(input.channelId, "events", eventId, "listing"), {
      method: "PATCH",
      body: { visibility: input.visibility }
    });
  }
};
var set_channel_event_visibility_default = setChannelEventVisibility;

// actions/remove-channel-event.ts
var removeChannelEvent = {
  key: "remove-channel-event",
  type: "perform",
  resource: "channel",
  title: "Remove Channel Event",
  description: "Take an event off one of your sales channels.",
  idempotent: false,
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true }
  ],
  output: [
    { key: "removed", type: "boolean", label: "Removed" },
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" }
  ],
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const eventId = resourceId(input.event, "events");
    ctx.log("info", "removing event from channel", { channelId: input.channelId, eventId });
    await new CohostClient(ctx).request(channelPath(input.channelId, "events", eventId), { method: "DELETE" });
    return { removed: true, eventId, channelId: input.channelId.trim() };
  }
};
var remove_channel_event_default = removeChannelEvent;

// actions/get-channel-event.ts
var OUTPUT5 = [
  ...CHANNEL_EVENT_OUTPUT,
  { key: "tickets", type: "array", label: "Tickets on the channel", items: CHANNEL_TICKET_OUTPUT }
];
var getChannelEvent = {
  key: "get-channel-event",
  type: "read",
  resource: "channel",
  title: "Get Channel Event",
  description: "Fetch an event as your sales channel shows it \u2014 its channel name, content blocks (with the description), whether sales are on, and its tickets at channel prices.",
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID, slug or URN)", type: "string", required: true },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed)."
    }
  ],
  output: OUTPUT5,
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const ref = {
      channelId: input.channelId.trim(),
      eventId: resourceId(input.event, "events"),
      listingId: input.listingId
    };
    ctx.log("info", "fetching channel event", { ...ref });
    try {
      const [event, tickets] = await Promise.all([
        fetchChannelEvent(ctx, ref),
        fetchChannelEventTickets(ctx, ref)
      ]);
      return { ...event, tickets };
    } catch (error) {
      if (isCohostNotFound(error)) throw notShownOnChannel(ref);
      throw error;
    }
  }
};
var get_channel_event_default = getChannelEvent;

// actions/find-mapped-resources.ts
var RESOURCE_FIELDS = [
  { key: "urn", type: "string", label: "URN" },
  { key: "labels", type: "object", label: "Labels" },
  { key: "labels.id", type: "string", label: "Provider ID" },
  { key: "labels.name", type: "string", label: "Name" },
  { key: "labels.source", type: "string", label: "Source (eventbrite, \u2026)" },
  { key: "labels.category", type: "string", label: "Category (ticket, event, \u2026)" },
  { key: "labels.eventId", type: "string", label: "Provider event ID" },
  { key: "meta", type: "object", label: "Meta" },
  { key: "meta.implementation", type: "object", label: "Connection app" },
  { key: "meta.implementation.id", type: "string", label: "Connection app ID (eventbrite@1.0.0, \u2026)" },
  { key: "meta.implementation.name", type: "string", label: "Connection app name" }
];
var OUTPUT6 = [{ key: "results", type: "array", label: "Mapped resources", items: RESOURCE_FIELDS }];
var findMappedResources = {
  key: "find-mapped-resources",
  type: "read",
  resource: "urn",
  title: "Find Mapped Resources",
  description: "List every resource mapped to a Cohost URN, e.g. the Eventbrite ticket classes linked to a ticket.",
  params: [
    {
      key: "urn",
      label: "URN",
      type: "string",
      required: true,
      hint: "e.g. urn:1:<company>:cohost-falcon:/events/<eventId>/tickets/<ticketId> \u2014 a change trigger's urn."
    },
    {
      key: "labels",
      label: "Label filters",
      type: "json",
      required: false,
      hint: "Optional JSON object with any label keys and values to match on mapped resources. All supplied labels must match; extra stored labels are allowed. Leave empty for no label filtering."
    }
  ],
  output: OUTPUT6,
  sample: {
    results: [
      {
        urn: "urn:1:co_sample:conn_sample:/events/1000000001/ticket_classes/1000000005",
        labels: {
          id: "1000000005",
          name: "General Admission",
          source: "eventbrite",
          category: "ticket",
          eventId: "1000000001",
          "-resource.connectionId": "conn_sample"
        },
        meta: {
          implementation: { id: "eventbrite@1.0.0", name: "Eventbrite" }
        }
      }
    ]
  },
  async execute(input, ctx) {
    ctx.log("info", "finding mapped resources", { urn: input.urn });
    const client = new CohostClient(ctx);
    const results = await client.request("/rms/urn/search", {
      query: { urn: input.urn, labels: input.labels === void 0 ? void 0 : JSON.stringify(input.labels) }
    });
    return { results };
  }
};
var find_mapped_resources_default = findMappedResources;

// actions/get-channel-event-snapshot.ts
var PAGE = 100;
var companyIdParam = {
  key: "companyId",
  label: "Company ID",
  type: "string",
  required: true,
  hidden: true,
  default: "{{ const.account_id }}",
  hint: "The account's company; the owner event's own company wins when it reports one."
};
async function lookupVisibility(ctx, channelId, eventId) {
  const client = new CohostClient(ctx);
  for (let offset = 0; ; offset += PAGE) {
    const page = await client.request(channelPath(channelId, "events"), {
      query: { status: "started", limit: PAGE, offset }
    });
    const p = page ?? {};
    const items = Array.isArray(page) ? page : Array.isArray(p.items) ? p.items : Array.isArray(p.results) ? p.results : [];
    const hit = items.find((i) => String(i.id) === eventId);
    if (hit) {
      const v = hit.listing?.visibility;
      return typeof v === "string" ? v : null;
    }
    const total = typeof p.total === "number" ? p.total : p.pagination?.total;
    if (items.length < PAGE || typeof total === "number" && offset + PAGE >= total) return null;
  }
}
var getChannelEventSnapshot = {
  key: "get-channel-event-snapshot",
  type: "read",
  resource: "channel",
  title: "Get Channel Event Snapshot",
  description: "Read an event on a sales channel in one call: the channel's view, the owner's inventory and any URN mappings.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "eventId", label: "Event ID", type: "string", required: true },
    companyIdParam,
    { key: "listingId", label: "Listing ID", type: "string", required: false },
    {
      key: "mappingLabels",
      label: "Mapping labels",
      type: "json",
      required: false,
      hint: "Label filters for the mapping lookups; without them no mappings are read."
    }
  ],
  output: [
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "eventUrn", type: "string", label: "Event URN" },
    { key: "listing", type: "object", label: "Listing" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "shown", type: "boolean", label: "Shown on the channel" },
    { key: "channelEvent", type: "object", label: "Channel view of the event" },
    { key: "channelTickets", type: "array", label: "Channel view of the tickets" },
    { key: "event", type: "object", label: "Owner event" },
    { key: "tickets", type: "array", label: "Owner tickets" },
    { key: "mappings", type: "object", label: "URN mappings (event, tickets by id)" }
  ],
  async execute(input, ctx) {
    const channelId = input.channelId.trim();
    const eventId = input.eventId.trim();
    const client = new CohostClient(ctx);
    ctx.log("info", "reading channel event snapshot", { channelId, eventId });
    const listings = await client.request(channelPath(channelId, "events", eventId, "listings"));
    const wanted = input.listingId?.trim();
    const all = Array.isArray(listings) ? listings : [];
    const listing = (wanted ? all.find((l) => l.listingId === wanted) : void 0) ?? all.find((l) => l.listingId === "primary") ?? null;
    const event = await client.request(`/events/${encodeURIComponent(eventId)}`);
    const owner = typeof event.companyId === "string" && event.companyId.trim() ? event.companyId.trim() : void 0;
    const companyId = owner ?? (typeof input.companyId === "string" ? input.companyId.trim() : "");
    if (!companyId) throw new Error("companyId is required (the account's company) when the event reports none");
    const eventUrn = `urn:1:${companyId}:cohost-falcon:/events/${eventId}`;
    const tickets = await client.request(`/events/${encodeURIComponent(eventId)}/tickets`, {
      query: { status: "all" }
      // default is live only; removed/hidden/sold-out tickets must reach the snapshot
    });
    let shown = true;
    let channelEvent = null;
    let channelTickets = [];
    const ref = { channelId, eventId, listingId: wanted };
    try {
      const [ce, ct] = await Promise.all([fetchChannelEvent(ctx, ref), fetchChannelEventTickets(ctx, ref)]);
      channelEvent = ce;
      channelTickets = ct;
    } catch (error) {
      if (!isCohostNotFound(error)) throw error;
      shown = false;
    }
    let visibility = null;
    if (shown) visibility = "visible";
    else if (event.status === "started") visibility = await lookupVisibility(ctx, channelId, eventId);
    const mappings = { event: [], tickets: {} };
    if (input.mappingLabels) {
      const look = async (urn, kind) => (await find_mapped_resources_default.execute({ urn, labels: { ...input.mappingLabels, kind } }, ctx)).results;
      mappings.event = await look(eventUrn, "event");
      const ids = new Set([...tickets, ...channelTickets].map((t) => String(t.id)));
      for (const id of ids) {
        mappings.tickets[id] = await look(`${eventUrn}/tickets/${id}`, "ticket");
      }
    }
    return { channelId, eventId, companyId, eventUrn, listing, visibility, shown, channelEvent, channelTickets, event, tickets, mappings };
  }
};
var get_channel_event_snapshot_default = getChannelEventSnapshot;

// actions/register-urn-mapping.ts
var parse = (urn) => {
  const match = /^urn:1:([^:\s/]+):([^:\s/]+):(\/[^\s?#]+)$/.exec(urn);
  if (!match || match[3].slice(1).split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Expected urn:1:<company>:<service>:/<resource-path>.");
  }
  return { company: match[1], service: match[2], path: match[3] };
};
var registerUrnMapping = {
  key: "register-urn-mapping",
  type: "perform",
  resource: "urn",
  title: "Register URN Mapping",
  description: "Map a Cohost resource to another resource, such as an Eventbrite event, with searchable labels.",
  idempotent: true,
  params: [
    {
      key: "urn",
      label: "Cohost URN",
      type: "string",
      required: true,
      hint: "The existing Cohost resource, e.g. urn:1:<company>:cohost-falcon:/events/<id>."
    },
    {
      key: "mappedUrn",
      label: "Mapped Resource URN",
      type: "string",
      required: true,
      hint: "The resource you created, e.g. urn:1:<company>:conn_\u2026:/events/<eventbrite-id>."
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      required: false,
      hint: "Optional JSON object saved on the mapped resource. Find Mapped Resources can filter by these labels. Existing labels are merged; no labels are added by default."
    }
  ],
  output: [
    { key: "urn", type: "string", label: "Mapped Resource URN" },
    { key: "labels", type: "object", label: "Labels" },
    { key: "resourceUrns", type: "array", label: "Resource URNs" },
    { key: "resources", type: "object", label: "Mapped Resources" }
  ],
  async execute(input, ctx) {
    const local = parse(input.urn);
    const mapped = parse(input.mappedUrn);
    const internal = (service) => service === "cohost-falcon" || service === "cohost-puma";
    if (!internal(local.service)) throw new Error("Cohost URN must use cohost-falcon or cohost-puma.");
    if (local.company !== mapped.company) throw new Error("Both URNs must belong to the same company.");
    if (internal(mapped.service) && local.path === mapped.path) throw new Error("Cannot map a resource to itself.");
    if (input.labels !== void 0 && (input.labels === null || typeof input.labels !== "object" || Array.isArray(input.labels))) {
      throw new Error("Labels must be a JSON object.");
    }
    const labels = input.labels ?? {};
    ctx.log("info", "registering urn mapping", { urn: input.urn, mappedUrn: input.mappedUrn });
    return new CohostClient(ctx).request("/rms/urn/mappings", {
      method: "POST",
      body: {
        urn: input.mappedUrn,
        labels,
        resources: [{ ...labels, urn: input.mappedUrn }, { urn: input.urn }]
      }
    });
  }
};
var register_urn_mapping_default = registerUrnMapping;

// actions/register-urn-mappings.ts
var registerUrnMappings = {
  key: "register-urn-mappings",
  type: "perform",
  resource: "urn",
  title: "Register URN Mappings",
  description: "Register several URN mappings in order, each exactly as Register URN Mapping does.",
  idempotent: true,
  params: [
    {
      key: "mappings",
      label: "Mappings",
      type: "json",
      required: true,
      hint: "JSON array of { urn, mappedUrn, labels? } \u2014 the inputs of Register URN Mapping."
    }
  ],
  output: [
    { key: "count", type: "number", label: "Mappings registered" },
    { key: "results", type: "array", label: "Results, one per mapping, in input order" }
  ],
  async execute(input, ctx) {
    if (!Array.isArray(input.mappings)) throw new Error("Mappings must be a JSON array.");
    const results = [];
    for (const item of input.mappings) results.push(await register_urn_mapping_default.execute(item, ctx));
    return { count: results.length, results };
  }
};
var register_urn_mappings_default = registerUrnMappings;

// actions/list-channel-event-tickets.ts
var OUTPUT7 = [
  { key: "results", type: "array", label: "Tickets on the channel", items: CHANNEL_TICKET_OUTPUT }
];
var listChannelEventTickets = {
  key: "list-channel-event-tickets",
  type: "read",
  resource: "channel",
  title: "List Channel Event Tickets",
  description: "List the tickets your sales channel sells for an event, at the channel's prices.",
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID, slug or URN)", type: "string", required: true },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed)."
    }
  ],
  output: OUTPUT7,
  resolveFields: resolveChannelFields,
  async execute(input, ctx) {
    const ref = {
      channelId: input.channelId.trim(),
      eventId: resourceId(input.event, "events"),
      listingId: input.listingId
    };
    ctx.log("info", "listing channel event tickets", { ...ref });
    try {
      return { results: await fetchChannelEventTickets(ctx, ref) };
    } catch (error) {
      if (isCohostNotFound(error)) throw notShownOnChannel(ref);
      throw error;
    }
  }
};
var list_channel_event_tickets_default = listChannelEventTickets;

// actions/delete-event-ticket.ts
var deleteEventTicket = {
  key: "delete-event-ticket",
  type: "perform",
  resource: "ticket",
  title: "Delete Event Ticket",
  description: "Delete a ticket type from a Cohost event.",
  idempotent: true,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "ticket", label: "Ticket ID", type: "string", required: true }
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Ticket ID" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "deleting event ticket", { event: input.event, ticket: input.ticket });
    const client = new CohostClient(ctx);
    await client.request(
      `/events/${encodeURIComponent(input.event)}/tickets/${encodeURIComponent(input.ticket)}`,
      { method: "DELETE" }
    );
    return { deleted: true, id: input.ticket };
  }
};
var delete_event_ticket_default = deleteEventTicket;

// actions/list-orders.ts
var listOrders = {
  key: "list-orders",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List Cohost orders, paginated.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "placed", label: "Placed" },
        { value: "voided", label: "Voided" },
        { value: "refunded", label: "Refunded" }
      ]
    },
    { key: "startDate", label: "Start Date", type: "datetime" },
    { key: "endDate", label: "End Date", type: "datetime" },
    ...paginationParams
  ],
  output: paginatedOutput("Orders"),
  async execute(input, ctx) {
    ctx.log("info", "listing orders", { status: input.status });
    const client = new CohostClient(ctx);
    return client.request("/orders", {
      query: {
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        ...paginationQuery(input)
      }
    });
  }
};
var list_orders_default = listOrders;

// actions/get-order.ts
var getOrder = {
  key: "get-order",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch a Cohost order by id or URN.",
  params: [
    {
      key: "order",
      label: "Order (ID or URN)",
      type: "string",
      required: true
    },
    {
      key: "uid",
      label: "User ID",
      type: "string",
      hint: "Optional. Forwarded as ?uid= for auth context."
    }
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "orderNumber", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "organizerId", type: "string", label: "Organizer ID" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "items", type: "array", label: "Items" },
    { key: "costs", type: "object", label: "Costs" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "fetching order", { order: input.order });
    const client = new CohostClient(ctx);
    return client.request(`/orders/${encodeURIComponent(resourceId(input.order, "orders"))}`, {
      query: { uid: input.uid }
    });
  }
};
var get_order_default = getOrder;

// actions/list-order-attendees.ts
var listOrderAttendees = {
  key: "list-order-attendees",
  type: "read",
  resource: "attendee",
  title: "List Order Attendees",
  description: "List the attendees belonging to a Cohost order.",
  params: [
    { key: "order", label: "Order (ID or URN)", type: "string", required: true },
    {
      key: "uid",
      label: "User ID",
      type: "string",
      hint: "Optional. Forwarded as ?uid= for auth context."
    }
  ],
  output: [{ key: "results", type: "array", label: "Attendees" }],
  async execute(input, ctx) {
    ctx.log("info", "listing order attendees", { order: input.order });
    const client = new CohostClient(ctx);
    const results = await client.request(
      `/orders/${encodeURIComponent(resourceId(input.order, "orders"))}/attendees`,
      { query: { uid: input.uid } }
    );
    return { results };
  }
};
var list_order_attendees_default = listOrderAttendees;

// actions/send-order-confirmation.ts
var sendOrderConfirmation = {
  key: "send-order-confirmation",
  type: "perform",
  resource: "order",
  title: "Send Order Confirmation",
  description: "Send the confirmation email for a Cohost order to the customer.",
  idempotent: false,
  params: [
    { key: "order", label: "Order (ID or URN)", type: "string", required: true }
  ],
  output: [{ key: "response", type: "object", label: "Response" }],
  async execute(input, ctx) {
    ctx.log("info", "sending order confirmation", { order: input.order });
    const client = new CohostClient(ctx);
    return client.request(`/orders/${encodeURIComponent(input.order)}/send-confirmation`, {
      method: "POST"
    });
  }
};
var send_order_confirmation_default = sendOrderConfirmation;

// actions/upsert-order.ts
var BODY_KEYS = ["order", "context", "source", "attendees"];
var isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var upsertOrder = {
  key: "upsert-order",
  type: "perform",
  resource: "order",
  title: "Upsert Order",
  description: "Insert or update a Cohost order by its URN. Pass a transformer's converted data ({ order, source, attendees }) as is; the order's event may be given by its remote URN. Returns the saved order.",
  idempotent: true,
  params: [
    {
      key: "data",
      label: "Order Data",
      type: "json",
      required: true,
      hint: "{ order, source?, attendees?, context? } \u2014 e.g. the Eventbrite \u2192 Cohost transformer's data. order.urn (the remote order's URN) is required; order.contextId may be the event's remote URN."
    }
  ],
  output: [
    { key: "order", type: "object", label: "Saved Order" },
    { key: "meta", type: "object", label: "Write Meta (action, changed)" }
  ],
  async execute(input, ctx) {
    const data = input.data;
    if (!isObject(data)) throw new Error("Order Data must be a JSON object: { order, source?, attendees? }.");
    if (!isObject(data.order)) {
      throw new Error("Order Data needs an order object: { order, source?, attendees? } (pass the transformer's data, not data.order).");
    }
    const stray = Object.keys(data).filter((k) => !BODY_KEYS.includes(k));
    if (stray.length) throw new Error(`Order Data takes ${BODY_KEYS.join(", ")}; got ${stray.join(", ")}.`);
    const urn = data.order.urn;
    if (typeof urn !== "string" || !urn) throw new Error("order.urn is required so a retry updates the same order.");
    if (data.attendees !== void 0 && !Array.isArray(data.attendees)) throw new Error("attendees must be an array.");
    ctx.log("info", "upserting order", { urn, attendees: Array.isArray(data.attendees) ? data.attendees.length : 0 });
    return new CohostClient(ctx).request("/orders", { method: "POST", query: { meta: 1 }, body: data });
  }
};
var upsert_order_default = upsertOrder;

// actions/list-coupons.ts
var listCoupons = {
  key: "list-coupons",
  type: "read",
  resource: "coupon",
  title: "List Coupons",
  description: "List Cohost coupons for the authenticated company.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Optional. Restrict to coupons scoped to one event."
    }
  ],
  output: [{ key: "results", type: "array", label: "Coupons" }],
  async execute(input, ctx) {
    ctx.log("info", "listing coupons", { eventId: input.eventId });
    const client = new CohostClient(ctx);
    const results = await client.request("/coupons", {
      query: { eventId: input.eventId }
    });
    return { results };
  }
};
var list_coupons_default = listCoupons;

// actions/create-coupon.ts
var createCoupon = {
  key: "create-coupon",
  type: "perform",
  resource: "coupon",
  title: "Create Coupon",
  description: "Create a Cohost coupon for the authenticated company.",
  idempotent: false,
  params: [
    { key: "code", label: "Code", type: "string", required: true },
    {
      key: "discountType",
      label: "Discount Type",
      type: "select",
      required: true,
      default: "percentage",
      options: [
        { value: "percentage", label: "Percentage" },
        { value: "fixed", label: "Fixed amount" }
      ]
    },
    {
      key: "discountValue",
      label: "Discount Value",
      type: "number",
      required: true,
      validation: { min: 0 }
    },
    { key: "maxUses", label: "Max Uses", type: "number", validation: { integer: true, min: 1 } },
    { key: "expiresAt", label: "Expires At", type: "datetime" },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Optional. Scope the coupon to a single event."
    }
  ],
  output: couponOutput,
  async execute(input, ctx) {
    ctx.log("info", "creating coupon", { code: input.code });
    const client = new CohostClient(ctx);
    return client.request("/coupons", {
      method: "POST",
      body: {
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt,
        eventId: input.eventId
      }
    });
  }
};
var create_coupon_default = createCoupon;

// actions/update-coupon.ts
var updateCoupon = {
  key: "update-coupon",
  type: "perform",
  resource: "coupon",
  title: "Update Coupon",
  description: "Partially update a Cohost coupon.",
  idempotent: true,
  params: [
    { key: "coupon", label: "Coupon ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Partial coupon fields, e.g. { "discountValue": 25, "maxUses": 150 }. id/companyId/created/updated are not accepted.'
    }
  ],
  output: couponOutput,
  async execute(input, ctx) {
    ctx.log("info", "updating coupon", { coupon: input.coupon });
    const client = new CohostClient(ctx);
    return client.request(`/coupons/${encodeURIComponent(input.coupon)}`, {
      method: "PATCH",
      body: input.patch
    });
  }
};
var update_coupon_default = updateCoupon;

// actions/delete-coupon.ts
var deleteCoupon = {
  key: "delete-coupon",
  type: "perform",
  resource: "coupon",
  title: "Delete Coupon",
  description: "Delete a Cohost coupon.",
  idempotent: true,
  params: [
    { key: "coupon", label: "Coupon ID", type: "string", required: true }
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Coupon ID" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "deleting coupon", { coupon: input.coupon });
    const client = new CohostClient(ctx);
    await client.request(`/coupons/${encodeURIComponent(input.coupon)}`, { method: "DELETE" });
    return { deleted: true, id: input.coupon };
  }
};
var delete_coupon_default = deleteCoupon;

// actions/list-organizers.ts
var listOrganizers = {
  key: "list-organizers",
  type: "read",
  resource: "organizer",
  title: "List Organizers",
  description: "List the Cohost organizers of the authenticated company.",
  params: [],
  output: [{ key: "results", type: "array", label: "Organizers" }],
  async execute(_input, ctx) {
    ctx.log("info", "listing organizers");
    const client = new CohostClient(ctx);
    const { organizers } = await client.request("/organizers");
    return { results: organizers };
  }
};
var list_organizers_default = listOrganizers;

// actions/get-organizer.ts
var getOrganizer = {
  key: "get-organizer",
  type: "read",
  resource: "organizer",
  title: "Get Organizer",
  description: "Fetch a Cohost organizer by id or URN.",
  params: [
    { key: "organizer", label: "Organizer (ID or URN)", type: "string", required: true }
  ],
  output: organizerOutput,
  async execute(input, ctx) {
    ctx.log("info", "fetching organizer", { organizer: input.organizer });
    const client = new CohostClient(ctx);
    const { organizer } = await client.request(
      `/organizers/${encodeURIComponent(resourceId(input.organizer, "organizers"))}`
    );
    return organizer;
  }
};
var get_organizer_default = getOrganizer;

// actions/create-organizer.ts
var createOrganizer = {
  key: "create-organizer",
  type: "perform",
  resource: "organizer",
  title: "Create Organizer",
  description: "Create a Cohost organizer for the authenticated company.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "organizer",
      label: "Additional Fields",
      type: "json",
      hint: 'Optional extra fields, e.g. { "headline": "\u2026", "bio": "\u2026", "links": [ \u2026 ] }. companyId is ignored.'
    }
  ],
  output: organizerOutput,
  async execute(input, ctx) {
    ctx.log("info", "creating organizer", { name: input.name });
    const client = new CohostClient(ctx);
    const { organizer } = await client.request("/organizers", {
      method: "POST",
      body: { organizer: { ...input.organizer, name: input.name } }
    });
    return organizer;
  }
};
var create_organizer_default = createOrganizer;

// actions/update-organizer.ts
var updateOrganizer = {
  key: "update-organizer",
  type: "perform",
  resource: "organizer",
  title: "Update Organizer",
  description: "Update a Cohost organizer.",
  idempotent: true,
  params: [
    { key: "organizer", label: "Organizer ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: "Organizer fields \u2014 the API requires `name`. id/companyId are ignored."
    }
  ],
  output: organizerOutput,
  async execute(input, ctx) {
    ctx.log("info", "updating organizer", { organizer: input.organizer });
    const client = new CohostClient(ctx);
    const { organizer } = await client.request(
      `/organizers/${encodeURIComponent(input.organizer)}`,
      { method: "PATCH", body: { organizer: input.patch } }
    );
    return organizer;
  }
};
var update_organizer_default = updateOrganizer;

// actions/delete-organizer.ts
var deleteOrganizer = {
  key: "delete-organizer",
  type: "perform",
  resource: "organizer",
  title: "Delete Organizer",
  description: "Delete a Cohost organizer.",
  idempotent: true,
  params: [
    { key: "organizer", label: "Organizer ID", type: "string", required: true }
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Organizer ID" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "deleting organizer", { organizer: input.organizer });
    const client = new CohostClient(ctx);
    await client.request(`/organizers/${encodeURIComponent(input.organizer)}`, {
      method: "DELETE"
    });
    return { deleted: true, id: input.organizer };
  }
};
var delete_organizer_default = deleteOrganizer;

// actions/get-me.ts
var getMe = {
  key: "get-me",
  type: "read",
  resource: "user",
  title: "Get My Profile",
  description: "Fetch the profile of the authenticated Cohost user.",
  params: [],
  output: [
    { key: "uid", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "first", type: "string", label: "First Name" },
    { key: "last", type: "string", label: "Last Name" },
    { key: "name", type: "string", label: "Name" },
    { key: "displayName", type: "string", label: "Display Name" },
    { key: "photoURL", type: "string", label: "Photo URL" },
    { key: "gender", type: "string", label: "Gender" },
    { key: "birthdate", type: "string", label: "Birthdate" }
  ],
  async execute(_input, ctx) {
    ctx.log("info", "fetching my profile");
    const client = new CohostClient(ctx);
    return client.request("/me");
  }
};
var get_me_default = getMe;

// actions/get-user.ts
var getUser = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User Profile",
  description: "Fetch a Cohost user's channel profile.",
  params: [
    { key: "user", label: "User (ID or URN)", type: "string", required: true },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: 'Which channel profile to read, e.g. "groov" or "cohost".'
    }
  ],
  output: [
    { key: "uid", type: "string", label: "User ID" },
    { key: "id", type: "string", label: "Profile ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "displayName", type: "string", label: "Display Name" },
    { key: "bio", type: "string", label: "Bio" },
    { key: "photoURL", type: "string", label: "Photo URL" },
    { key: "website", type: "string", label: "Website" },
    { key: "location", type: "string", label: "Location" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "socialLinks", type: "object", label: "Social Links" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "fetching user profile", { user: input.user, channelId: input.channelId });
    const client = new CohostClient(ctx);
    return client.request(`/users/${encodeURIComponent(resourceId(input.user, "users"))}`, {
      headers: { "x-cohost-channel-id": input.channelId }
    });
  }
};
var get_user_default = getUser;

// actions/list-users.ts
var listUsers = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List User Profiles",
  description: "List public Cohost channel profiles.",
  params: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: 'Which channel to list, e.g. "groov" or "cohost".'
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Default 20, max 100.",
      validation: { integer: true, min: 1, max: 100 }
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Default 0.",
      validation: { integer: true, min: 0 }
    },
    { key: "verified", label: "Verified Only", type: "boolean" }
  ],
  output: [
    { key: "results", type: "array", label: "Profiles" },
    { key: "pagination.total", type: "number", label: "Total" },
    { key: "pagination.limit", type: "number", label: "Limit" },
    { key: "pagination.offset", type: "number", label: "Offset" },
    { key: "pagination.hasMore", type: "boolean", label: "Has More" }
  ],
  async execute(input, ctx) {
    ctx.log("info", "listing user profiles", { channelId: input.channelId });
    const client = new CohostClient(ctx);
    return client.request("/users", {
      query: { limit: input.limit, offset: input.offset, verified: input.verified },
      headers: { "x-cohost-channel-id": input.channelId }
    });
  }
};
var list_users_default = listUsers;

// actions/resolve-urn.ts
var OUTPUT8 = [
  { key: "urn", type: "string", label: "URN" },
  { key: "labels", type: "object", label: "Labels" },
  { key: "resources", type: "array", label: "Resources", items: [{ key: "urn", type: "string", label: "URN" }] }
];
var resolveUrn = {
  key: "resolve-urn",
  type: "read",
  resource: "urn",
  title: "Resolve URN",
  description: "Get a URN's mapping: its labels and the resources mapped to it, optionally only Cohost records.",
  params: [
    {
      key: "urn",
      label: "URN",
      type: "string",
      required: true,
      hint: "e.g. urn:1:<company>:conn_\u2026:/events/<id>/ticket_classes/<id>"
    },
    {
      key: "type",
      label: "Resource Type",
      type: "string",
      hint: "Optional. system-resource returns only the Cohost records. Empty returns every resource."
    }
  ],
  output: OUTPUT8,
  async execute(input, ctx) {
    ctx.log("info", "resolving urn", { urn: input.urn, type: input.type });
    const client = new CohostClient(ctx);
    return client.request("/rms/urn/resolve", {
      method: "POST",
      body: { urn: input.urn, ...input.type ? { type: input.type } : {} }
    });
  }
};
var resolve_urn_default = resolveUrn;

// actions/sync-object.ts
var TYPES2 = ["event", "ticket", "order"];
var isObject2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var isEnvelope = (value) => Object.keys(value).every((k) => k === "type" || k === "urn" || k === "data") && TYPES2.includes(value.type) && typeof value.urn === "string" && value.urn !== "" && isObject2(value.data);
var isCohostUrn = (urn) => /^urn:1:[^:]+:cohost-(falcon|puma):/.test(urn);
var ownUrn = (data) => {
  const urn = isObject2(data.order) ? data.order.urn : data.urn;
  return typeof urn === "string" && urn ? urn : void 0;
};
var syncObject = {
  key: "sync-object",
  type: "perform",
  resource: "urn",
  title: "Sync Object",
  description: "Insert or update a Cohost event, ticket or order. Pass a transformer's output as data (or the object, its type, and the remote URN it came from); Cohost updates the object that URN is mapped to, or inserts and maps it. Returns the saved object.",
  idempotent: true,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "event",
      options: [
        { value: "event", label: "Event" },
        { value: "ticket", label: "Ticket" },
        { value: "order", label: "Order" }
      ]
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      required: true,
      hint: "The object to save, in Cohost's shape. A transformer's whole output ({ type, urn, data }) works as is: its type and urn are used, so Type and Mapped URN can stay as they are."
    },
    {
      key: "mappedUrn",
      label: "Mapped URN",
      type: "string",
      required: false,
      hint: "The remote resource's URN, e.g. the transformer's urn (urn:1:<company>:conn_\u2026:/events/<id>). Updates the Cohost object it is mapped to, or inserts the object and maps it."
    },
    {
      key: "mappedUrnLabels",
      label: "Mapped URN Labels",
      type: "json",
      required: false,
      hint: 'Labels merged onto the mapping, e.g. { "source": "eventbrite" }; searchable with Find Mapped Resources.'
    },
    {
      key: "urn",
      label: "Cohost URN",
      type: "string",
      required: false,
      hint: "Optional: force a specific Cohost object (urn:1:<company>:cohost-falcon:/events/<id>). Usually left empty."
    }
  ],
  output: [
    { key: "type", type: "string", label: "Type" },
    { key: "urn", type: "string", label: "Cohost URN" },
    { key: "mappedUrn", type: "string", label: "Mapped URN" },
    { key: "mappedUrnLabels", type: "object", label: "Mapped URN Labels" },
    { key: "id", type: "string", label: "Cohost ID" },
    { key: "data", type: "object", label: "Saved Object" },
    { key: "meta", type: "object", label: "Write Meta (action: create, update or unchanged; changed)" }
  ],
  async execute(input, ctx) {
    if (!isObject2(input.data)) throw new Error("Data must be a JSON object.");
    const { mappedUrnLabels } = input;
    let { type, data, mappedUrn, urn } = input;
    if (mappedUrn !== void 0 && mappedUrn !== "" && typeof mappedUrn !== "string") {
      throw new Error("Mapped URN must be a URN string.");
    }
    if (urn !== void 0 && urn !== "" && typeof urn !== "string") throw new Error("Cohost URN must be a URN string.");
    if (isEnvelope(data)) {
      if (type !== data.type) ctx.log("info", "using the type of the transformer output", { type: data.type });
      type = data.type;
      if (!mappedUrn && !urn) mappedUrn = data.urn;
      data = data.data;
    }
    if (!TYPES2.includes(type)) throw new Error(`Type must be one of ${TYPES2.join(", ")}.`);
    if (mappedUrnLabels !== void 0 && !isObject2(mappedUrnLabels)) {
      throw new Error('Mapped URN Labels must be a JSON object, e.g. { "source": "eventbrite" }.');
    }
    if (!urn && !mappedUrn) {
      const own = ownUrn(data);
      if (own && isCohostUrn(own)) urn = own;
      else mappedUrn = own;
    }
    if (!urn && !mappedUrn) {
      throw new Error("No URN to sync by: pass a transformer's output as Data, or set the Mapped URN (or a Cohost URN).");
    }
    ctx.log("info", "syncing object", { type, mappedUrn, urn });
    return new CohostClient(ctx).request("/rms/sync", {
      method: "POST",
      body: {
        type,
        data,
        ...mappedUrn ? { mappedUrn } : {},
        ...mappedUrnLabels ? { mappedUrnLabels } : {},
        ...urn ? { urn } : {}
      }
    });
  }
};
var sync_object_default = syncObject;

// lib/friendly.ts
var AMOUNT = /^([A-Za-z]{3}),(-?\d+)$/;
var TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
var DEFAULT_LOCALE = "en-US";
function isTimezone(tz) {
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
function resolveTimezone(tz) {
  if (tz === void 0 || tz === "") return "UTC";
  if (!isTimezone(tz)) throw new Error(`unknown timezone: ${JSON.stringify(tz)} (expected an IANA zone like "America/New_York")`);
  return tz;
}
var currencies;
var isCurrency = (code) => (currencies ??= new Set(Intl.supportedValuesOf("currency"))).has(code);
function friendlyCurrency(raw, currency, value, locale) {
  if (!isCurrency(currency)) return null;
  const padded = new Intl.NumberFormat(locale, { style: "currency", currency });
  const decimals = padded.resolvedOptions().maximumFractionDigits ?? 2;
  const major = value / 10 ** decimals;
  const whole2 = Number.isInteger(major);
  const display = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: whole2 ? 0 : decimals,
    maximumFractionDigits: decimals
  }).format(major);
  const symbol = padded.formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
  return {
    kind: "currency",
    value,
    major,
    display,
    displayPadded: padded.format(major),
    displayCode: `${major.toFixed(decimals)} ${currency}`,
    currency,
    symbol,
    decimals,
    isZero: value === 0,
    isNegative: value < 0,
    raw
  };
}
var pad = (n2, width = 2) => String(Math.abs(n2)).padStart(width, "0");
function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}
var whole = (n2) => Math.trunc(n2) || 0;
var COMPACT = [
  ["years", "y", "year"],
  ["months", "mo", "month"],
  ["weeks", "w", "week"],
  ["days", "d", "day"],
  ["hours", "h", "hour"],
  ["minutes", "m", "minute"]
];
function relative(epoch, now, locale) {
  const ms = epoch - now.getTime();
  const seconds = ms / 1e3;
  const days = seconds / 86400;
  const units = {
    seconds: whole(seconds),
    minutes: whole(seconds / 60),
    hours: whole(seconds / 3600),
    days: whole(days),
    weeks: whole(days / 7),
    months: whole(days / 30.436875),
    years: whole(days / 365.2425)
  };
  const largest = COMPACT.find(([key]) => units[key] !== 0);
  const amount = largest ? units[largest[0]] : units.seconds;
  const display = largest ? amount > 0 ? `in ${amount}${largest[1]}` : `${-amount}${largest[1]} ago` : "now";
  const text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(amount, largest ? largest[2] : "second");
  return { display, text, isPast: ms < 0, ...units };
}
function friendlyDate(raw, epoch, timezone, locale, now) {
  const date = new Date(epoch);
  const fmt = (opts) => new Intl.DateTimeFormat(locale, { timeZone: timezone, ...opts }).format(date);
  const p = zonedParts(date, timezone);
  const offsetMinutes = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(epoch / 1e3) * 1e3) / 6e4);
  const offset = `${offsetMinutes < 0 ? "-" : "+"}${pad(Math.trunc(offsetMinutes / 60))}:${pad(offsetMinutes % 60)}`;
  const isoDate = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  const time24 = `${pad(p.hour)}:${pad(p.minute)}`;
  const timezoneName = new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? timezone;
  return {
    kind: "date",
    utc: date.toISOString(),
    local: `${isoDate}T${time24}:${pad(p.second)}.${pad(date.getUTCMilliseconds(), 3)}${offset}`,
    timezone,
    timezoneName,
    offset,
    epoch,
    short: fmt({ dateStyle: "short", timeStyle: "short" }),
    medium: fmt({ dateStyle: "medium", timeStyle: "short" }),
    long: fmt({ dateStyle: "long", timeStyle: "short" }),
    full: fmt({ dateStyle: "full", timeStyle: "short" }),
    dateShort: fmt({ dateStyle: "short" }),
    dateMedium: fmt({ dateStyle: "medium" }),
    dateLong: fmt({ dateStyle: "long" }),
    dateFull: fmt({ dateStyle: "full" }),
    time: fmt({ timeStyle: "short" }),
    time24,
    isoDate,
    year: p.year,
    month: p.month,
    monthName: fmt({ month: "long" }),
    monthShort: fmt({ month: "short" }),
    day: p.day,
    weekday: fmt({ weekday: "long" }),
    weekdayShort: fmt({ weekday: "short" }),
    hour: p.hour,
    minute: p.minute,
    relative: relative(epoch, now, locale),
    raw
  };
}
function toFriendly(value, opts = {}) {
  if (typeof value !== "string") return null;
  const locale = opts.locale || DEFAULT_LOCALE;
  const trimmed = value.trim();
  const amount = AMOUNT.exec(trimmed);
  if (amount) return friendlyCurrency(value, amount[1].toUpperCase(), Number(amount[2]), locale);
  if (TIMESTAMP.test(trimmed)) {
    const epoch = Date.parse(trimmed);
    if (!Number.isNaN(epoch)) {
      return friendlyDate(value, epoch, resolveTimezone(opts.timezone), locale, opts.now ?? /* @__PURE__ */ new Date());
    }
  }
  return null;
}
var TIMEZONE_KEYS = /* @__PURE__ */ new Set(["timezone", "timeZone", "tz"]);
function findTimezone(data) {
  if (Array.isArray(data)) {
    for (const item of data) {
      const tz = findTimezone(item);
      if (tz) return tz;
    }
    return void 0;
  }
  if (data === null || typeof data !== "object") return void 0;
  for (const [key, value] of Object.entries(data)) {
    if (TIMEZONE_KEYS.has(key) && isTimezone(value)) return value;
  }
  for (const value of Object.values(data)) {
    const tz = findTimezone(value);
    if (tz) return tz;
  }
  return void 0;
}
function walk(value, opts) {
  if (typeof value === "string") return toFriendly(value, opts) ?? value;
  if (Array.isArray(value)) return value.map((item) => walk(item, opts));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, walk(v, opts)]));
  }
  return value;
}
function friendlyData(data, opts = {}) {
  const timezone = resolveTimezone(opts.timezone || findTimezone(data));
  return walk(data, { ...opts, timezone, now: opts.now ?? /* @__PURE__ */ new Date() });
}

// actions/friendly-value.ts
var friendlyValue = {
  key: "friendly-value",
  type: "perform",
  resource: "format",
  title: "Make Value Friendly",
  description: 'Turn a Cohost amount ("USD,5500") or a UTC timestamp into display-ready fields: $55, June 14, 2027, in 7mo, and more.',
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "value", label: "Value", type: "string", required: true, hint: "An amount like USD,5500 or a timestamp like 2027-06-14T23:00:00.000Z." },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/New_York", hint: "IANA zone for the local date fields. Defaults to UTC." },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US", hint: "Language and region for the display strings. Defaults to en-US." }
  ],
  output: [
    { key: "kind", type: "string", label: "Kind (currency, date or unknown)" },
    { key: "display", type: "string", label: "Display (currency)" },
    { key: "displayPadded", type: "string", label: "Display, padded (currency)" },
    { key: "major", type: "number", label: "Major Units (currency)" },
    { key: "value", type: "number", label: "Minor Units (currency)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "isZero", type: "boolean", label: "Is Zero (currency)" },
    { key: "local", type: "string", label: "Local Time (date)" },
    { key: "long", type: "string", label: "Long Format (date)" },
    { key: "dateLong", type: "string", label: "Long Date (date)" },
    { key: "time", type: "string", label: "Time (date)" },
    { key: "relative", type: "object", label: "Relative (date)" },
    { key: "raw", type: "string", label: "Original Value" }
  ],
  sample: {
    kind: "currency",
    value: 5500,
    major: 55,
    display: "$55",
    displayPadded: "$55.00",
    displayCode: "55.00 USD",
    currency: "USD",
    symbol: "$",
    decimals: 2,
    isZero: false,
    isNegative: false,
    raw: "USD,5500"
  },
  execute(input) {
    return toFriendly(input.value, { timezone: input.timezone, locale: input.locale }) ?? { kind: "unknown", raw: input.value };
  }
};
var friendly_value_default = friendlyValue;

// actions/friendly-data.ts
var friendlyDataAction = {
  key: "friendly-data",
  type: "perform",
  resource: "format",
  title: "Make Data Friendly",
  description: 'Replace every amount ("USD,5500") and UTC timestamp in an order, event, ticket or any object with display-ready fields, so a template can print them without helpers.',
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Data (JSON)", type: "json", required: true },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/New_York", hint: "IANA zone for the local date fields. Defaults to the first timezone found in the data (an order's event zone), else UTC." },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US", hint: "Language and region for the display strings. Defaults to en-US." }
  ],
  // The result has the shape of whatever went in.
  output: [],
  execute(input) {
    return friendlyData(input.data, { timezone: input.timezone, locale: input.locale });
  }
};
var friendly_data_default = friendlyDataAction;

// lib/friendly-output.ts
var friendlyParam = {
  key: "friendly",
  label: "Friendly Format",
  type: "boolean",
  default: false,
  hint: 'Return amounts and dates pre-formatted (e.g. costs.total.display \u2192 "$55") instead of "USD,5500" and ISO strings.'
};
function withFriendlyOutput(action) {
  if (action.type !== "read" && action.type !== "search") return action;
  return {
    ...action,
    params: [...action.params ?? [], friendlyParam],
    async execute(input, ctx) {
      const result = await action.execute(input, ctx);
      return input?.friendly === true ? friendlyData(result) : result;
    }
  };
}

// index.ts
var index_default = {
  actions: [
    // events
    list_events_default,
    get_event_default,
    search_events_default,
    create_event_default,
    update_event_default,
    get_event_blocks_default,
    list_event_attendees_default,
    get_event_attendee_default,
    // tickets
    list_event_tickets_default,
    get_event_ticket_default,
    create_event_tickets_default,
    update_event_ticket_default,
    delete_event_ticket_default,
    // orders
    list_orders_default,
    get_order_default,
    list_order_attendees_default,
    send_order_confirmation_default,
    upsert_order_default,
    // coupons
    list_coupons_default,
    create_coupon_default,
    update_coupon_default,
    delete_coupon_default,
    // organizers
    list_organizers_default,
    get_organizer_default,
    create_organizer_default,
    update_organizer_default,
    delete_organizer_default,
    // sales channels
    list_channels_default,
    get_channel_default,
    create_channel_default,
    update_channel_default,
    delete_channel_default,
    list_channel_events_default,
    get_channel_event_default,
    get_channel_event_snapshot_default,
    list_channel_event_tickets_default,
    list_channel_event_listings_default,
    set_channel_event_visibility_default,
    remove_channel_event_default,
    set_channel_listing_properties_default,
    // price formulas
    list_price_formulas_default,
    get_price_formula_default,
    create_price_formula_default,
    update_price_formula_default,
    delete_price_formula_default,
    assign_price_formula_default,
    // users
    get_me_default,
    get_user_default,
    list_users_default,
    // urn mappings
    find_mapped_resources_default,
    resolve_urn_default,
    register_urn_mapping_default,
    register_urn_mappings_default,
    sync_object_default,
    // formatting
    friendly_value_default,
    friendly_data_default
  ].map(withFriendlyOutput),
  triggers: [
    order_placed_default,
    order_changed_default,
    order_confirmation_requested_default,
    event_changed_default,
    ticket_changed_default,
    attendee_changed_default,
    object_changed_default,
    channel_event_changed_default,
    channel_changed_default
  ],
  auth: [tenant_default, api_token_default]
};
export {
  index_default as default
};
