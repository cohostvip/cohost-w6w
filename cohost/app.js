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
function toNotification(raw) {
  const ping = pingOf(raw);
  const dot = ping.action.indexOf(".");
  const segments = ping.context.resourcePath.split("/").filter(Boolean);
  return {
    urn: ping.urn,
    type: ping.action.slice(0, dot),
    action: ping.action.slice(dot + 1),
    webhookEvent: ping.action,
    id: segments[segments.length - 1],
    ...segments[0] === "events" && segments[1] ? { eventId: segments[1] } : {},
    resourcePath: ping.context.resourcePath,
    companyId: ping.context.companyId,
    changedFields: ping.data?.changedFields ?? [],
    timestamp: ping.timestamp
  };
}
var notificationOutput = [
  { key: "urn", type: "string", label: "URN" },
  { key: "type", type: "string", label: "Type" },
  { key: "action", type: "string", label: "Action" },
  { key: "webhookEvent", type: "string", label: "Webhook Event" },
  { key: "id", type: "string", label: "ID" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "resourcePath", type: "string", label: "Resource Path" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "changedFields", type: "array", label: "Changed Fields (e.g. costs, costs.tax)" },
  { key: "timestamp", type: "string", label: "Timestamp" }
];
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
function notificationSample(type, action, resourcePath, changedFields) {
  const segments = resourcePath.split("/").filter(Boolean);
  return {
    urn: `urn:1:${ID.company}:cohost-falcon:${resourcePath}`,
    type,
    action,
    webhookEvent: `${type}.${action}`,
    id: segments[segments.length - 1],
    ...segments[0] === "events" && segments[1] ? { eventId: segments[1] } : {},
    resourcePath,
    companyId: ID.company,
    changedFields,
    timestamp: "2026-11-01T20:34:10.000Z"
  };
}
var OBJECT_CHANGED_OUTPUT = notificationOutput;
var OBJECT_CHANGED_SAMPLE = notificationSample(
  "offering",
  "updated",
  `/events/${ID.event}/tickets/${ID.ticket}`,
  ["capacity"]
);
var EVENT_CHANGED_OUTPUT = [
  ...notificationOutput,
  o("event", "Event (null once deleted)"),
  ...prefixOutput("event", EVENT_OUTPUT)
];
var EVENT_CHANGED_SAMPLE = {
  ...notificationSample("event", "updated", `/events/${ID.event}`, ["name", "start"]),
  event: EVENT_SAMPLE
};
var TICKET_CHANGED_OUTPUT = [
  ...notificationOutput,
  o("ticket", "Ticket (null once deleted)"),
  ...prefixOutput("ticket", TICKET_OUTPUT)
];
var TICKET_CHANGED_SAMPLE = {
  ...notificationSample("offering", "updated", `/events/${ID.event}/tickets/${ID.ticket}`, [
    "costs",
    "costs.tax",
    "costs.total",
    "changed"
  ]),
  ticket: TICKET_SAMPLE
};

// triggers/order-placed.ts
function orderIdFromPath(resourcePath) {
  const parts = resourcePath.split("/").filter(Boolean);
  return parts[parts.length - 1];
}
var orderPlaced = {
  key: "order-placed",
  title: "Order Placed",
  description: "Fires when a Cohost order is placed.",
  output: ORDER_DETAILS_OUTPUT,
  sample: ORDER_DETAILS_SAMPLE,
  async onSubscribe({ callbackUrl }, ctx) {
    const client = new CohostClient(ctx);
    const webhook = await client.request("/webhooks", {
      method: "POST",
      body: { name: "w6w: order placed", url: callbackUrl, events: ["order.placed"] }
    });
    return { webhookId: webhook.id };
  },
  async onUnsubscribe({ state }, ctx) {
    const client = new CohostClient(ctx);
    await client.request(`/webhooks/${encodeURIComponent(state.webhookId)}`, { method: "DELETE" });
  },
  async handleIngest({ raw }, ctx) {
    const ping = pingOf(raw);
    const orderId = orderIdFromPath(ping.context.resourcePath);
    const client = new CohostClient(ctx);
    const order = await client.request(`/orders/${encodeURIComponent(orderId)}`);
    return [order];
  }
};
var order_placed_default = orderPlaced;

// triggers/order-changed.ts
function orderIdFromPath2(resourcePath) {
  const parts = resourcePath.split("/").filter(Boolean);
  return parts[parts.length - 1];
}
var orderChanged = {
  key: "order-changed",
  title: "Order Changed",
  description: "Fires when a Cohost order is changed.",
  output: ORDER_DETAILS_OUTPUT,
  sample: ORDER_DETAILS_SAMPLE,
  async onSubscribe({ callbackUrl }, ctx) {
    const client = new CohostClient(ctx);
    const webhook = await client.request("/webhooks", {
      method: "POST",
      body: { name: "w6w: order changed", url: callbackUrl, events: ["order.changed"] }
    });
    return { webhookId: webhook.id };
  },
  async onUnsubscribe({ state }, ctx) {
    const client = new CohostClient(ctx);
    await client.request(`/webhooks/${encodeURIComponent(state.webhookId)}`, { method: "DELETE" });
  },
  async handleIngest({ raw }, ctx) {
    const ping = pingOf(raw);
    const orderId = orderIdFromPath2(ping.context.resourcePath);
    const client = new CohostClient(ctx);
    const order = await client.request(`/orders/${encodeURIComponent(orderId)}`);
    return [order];
  }
};
var order_changed_default = orderChanged;

// triggers/order-confirmation-requested.ts
function orderIdFromPath3(resourcePath) {
  const parts = resourcePath.split("/").filter(Boolean);
  return parts[parts.length - 1];
}
var orderConfirmationRequested = {
  key: "order-confirmation-requested",
  title: "Order Confirmation Requested",
  description: "Fires when Cohost determines an order confirmation email is due.",
  output: ORDER_DETAILS_OUTPUT,
  sample: ORDER_DETAILS_SAMPLE,
  async onSubscribe({ callbackUrl }, ctx) {
    const client = new CohostClient(ctx);
    const webhook = await client.request("/webhooks", {
      method: "POST",
      body: {
        name: "w6w: order confirmation requested",
        url: callbackUrl,
        events: ["order.confirmation-requested"]
      }
    });
    return { webhookId: webhook.id };
  },
  async onUnsubscribe({ state }, ctx) {
    const client = new CohostClient(ctx);
    await client.request(`/webhooks/${encodeURIComponent(state.webhookId)}`, { method: "DELETE" });
  },
  async handleIngest({ raw }, ctx) {
    const ping = pingOf(raw);
    const orderId = orderIdFromPath3(ping.context.resourcePath);
    const client = new CohostClient(ctx);
    const order = await client.request(`/orders/${encodeURIComponent(orderId)}`);
    return [order];
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
    const change = toNotification(raw);
    const event = change.action === "deleted" ? null : await new CohostClient(ctx).request(`/events/${encodeURIComponent(change.id)}`);
    return [{ ...change, event }];
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
    const change = toNotification(raw);
    const ticket = change.action === "deleted" || !change.eventId ? null : await new CohostClient(ctx).request(
      `/events/${encodeURIComponent(change.eventId)}/tickets/${encodeURIComponent(change.id)}`
    );
    return [{ ...change, ticket }];
  }
};
var ticket_changed_default = ticketChanged;

// triggers/object-changed.ts
var EVENTS = {
  event: ["created", "updated", "deleted", "published"],
  offering: ["created", "updated", "deleted"],
  order: ["created", "updated", "placed", "refunded"],
  attendee: ["created", "deleted", "checked_in"]
};
var TYPES = Object.keys(EVENTS);
var ACTIONS3 = [...new Set(Object.values(EVENTS).flat())];
var DEFAULT_ACTIONS2 = ["created", "updated", "deleted"];
function webhookEvents(params) {
  const types = pickValues("types", params.types, TYPES, TYPES);
  const actions = pickValues("actions", params.actions, ACTIONS3, DEFAULT_ACTIONS2);
  const events = types.flatMap((t) => actions.filter((a2) => EVENTS[t].includes(a2)).map((a2) => `${t}.${a2}`));
  if (events.length === 0) {
    throw new TypeError(`Cohost emits none of ${actions.join(", ")} for ${types.join(", ")}.`);
  }
  return events;
}
var objectChanged = {
  key: "object-changed",
  title: "Object Changed",
  description: "Fires when a Cohost event, ticket, order or attendee changes. Sends its URN, action and type.",
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
      default: [...DEFAULT_ACTIONS2],
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
  handleIngest({ raw }) {
    return [toNotification(raw)];
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
  },
  {
    key: "continuation",
    label: "Continuation Token",
    type: "string",
    hint: "Opaque cursor returned by a previous page."
  }
];
var paginationQuery = (input) => ({
  page: input.page,
  size: input.size,
  continuation: input.continuation
});
var paginatedOutput = (label) => [
  { key: "results", type: "array", label },
  { key: "pagination.page", type: "number", label: "Page" },
  { key: "pagination.size", type: "number", label: "Page Size" },
  { key: "pagination.total", type: "number", label: "Total" },
  { key: "pagination.continuation", type: "string", label: "Continuation Token" }
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
var searchEvents = {
  key: "search-events",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search Cohost events, paginated.",
  params: [
    { key: "q", label: "Query", type: "string", hint: "Free-text search term." },
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
    ctx.log("info", "searching events", { q: input.q });
    const client = new CohostClient(ctx);
    return client.request("/events/search", {
      query: { q: input.q, ...input.filters, ...paginationQuery(input) }
    });
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
var OUTPUT = [{ key: "results", type: "array", label: "Mapped resources", items: RESOURCE_FIELDS }];
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
  output: OUTPUT,
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

// actions/resolve-urn.ts
var OUTPUT2 = [
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
  output: OUTPUT2,
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

// actions/sync-object.ts
var TYPES2 = ["event", "ticket", "order"];
var isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var syncObject = {
  key: "sync-object",
  type: "perform",
  resource: "urn",
  title: "Sync Object",
  description: "Insert or update a Cohost event, ticket or order. Pass the converted object as data, its type, and the remote URN it came from; Cohost updates the object that URN is mapped to, or inserts and maps it. Returns the saved object.",
  idempotent: true,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
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
      hint: "The object to save, in Cohost's shape (e.g. a transformer's converted `data`)."
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
    { key: "meta", type: "object", label: "Write Meta (action, changed)" }
  ],
  async execute(input, ctx) {
    if (!TYPES2.includes(input.type)) throw new Error(`Type must be one of ${TYPES2.join(", ")}.`);
    if (!isObject(input.data)) throw new Error("Data must be a JSON object.");
    const { mappedUrn, mappedUrnLabels, urn } = input;
    if (mappedUrn !== void 0 && (typeof mappedUrn !== "string" || !mappedUrn)) {
      throw new Error("Mapped URN must be a URN string.");
    }
    if (mappedUrnLabels !== void 0 && !isObject(mappedUrnLabels)) {
      throw new Error('Mapped URN Labels must be a JSON object, e.g. { "source": "eventbrite" }.');
    }
    if (!urn && !mappedUrn) throw new Error("Pass the Mapped URN (or a Cohost URN).");
    ctx.log("info", "syncing object", { type: input.type, mappedUrn, urn });
    return new CohostClient(ctx).request("/rms/sync", {
      method: "POST",
      body: {
        type: input.type,
        data: input.data,
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
    // users
    get_me_default,
    get_user_default,
    list_users_default,
    // urn mappings
    find_mapped_resources_default,
    resolve_urn_default,
    register_urn_mapping_default,
    sync_object_default,
    // formatting
    friendly_value_default,
    friendly_data_default
  ].map(withFriendlyOutput),
  triggers: [order_placed_default, order_changed_default, order_confirmation_requested_default, event_changed_default, ticket_changed_default, object_changed_default],
  auth: [tenant_default, api_token_default]
};
export {
  index_default as default
};
