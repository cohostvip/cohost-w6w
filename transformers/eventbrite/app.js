// lib/outbound.ts
function ebDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`invalid datetime: ${JSON.stringify(value)}`);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
function idFromUrn(urn, segment) {
  if (typeof urn !== "string") return void 0;
  const [, , , service = "", path = ""] = urn.split(":");
  const match = new RegExp(`/${segment}/([^/]+)`).exec(path);
  return match && !service.startsWith("cohost") ? decodeURIComponent(match[1]) : void 0;
}
function importedId(value) {
  const fromEventbrite = value.source === void 0 || value.source === "eventbrite";
  const id = value.refId ?? value.sourceId;
  return fromEventbrite && typeof id === "string" && id ? id : void 0;
}

// lib/events.ts
var SOURCE = "eventbrite";
var SUMMARY_MAX = 140;
var EB_TO_COHOST_STATUS = {
  draft: "draft",
  live: "live",
  started: "started",
  ended: "ended",
  completed: "completed",
  canceled: "canceled"
};
function eventbriteEventToCohost(eb) {
  const start = eb.start?.utc ?? eb.start?.local ?? "";
  const end = eb.end?.utc ?? eb.end?.local ?? "";
  const tz = eb.start?.timezone ?? eb.end?.timezone ?? "UTC";
  const name = eb.name?.text?.trim() || "Untitled event";
  const summary = eb.summary?.trim() || eb.name?.text?.trim() || name;
  const logoUrl = eb.logo?.original?.url ?? eb.logo?.url;
  return {
    name,
    summary,
    description: eb.description?.html ?? eb.description?.text ?? null,
    tz,
    start,
    end,
    status: EB_TO_COHOST_STATUS[eb.status ?? ""] ?? "draft",
    currency: (eb.currency ?? "USD").toUpperCase(),
    flyer: logoUrl ? {
      url: logoUrl,
      width: eb.logo?.original?.width,
      height: eb.logo?.original?.height
    } : null,
    capacity: eb.capacity ?? null,
    source: SOURCE,
    sourceId: eb.id
  };
}
function cohostEventToEventbrite(ev) {
  const summary = (ev.summary?.trim() || descriptionText(ev.description)).slice(0, SUMMARY_MAX).trim();
  const eventId = idFromUrn(ev.urn, "events") ?? importedId(ev);
  return {
    ...eventId ? { eventId } : {},
    name: ev.name,
    ...summary ? { summary } : {},
    ...ev.start ? { startUtc: ebDateTime(ev.start) } : {},
    ...ev.end ? { endUtc: ebDateTime(ev.end) } : {},
    ...ev.tz ? { timezone: ev.tz } : {},
    currency: ev.currency.toUpperCase(),
    ...typeof ev.capacity === "number" ? { capacity: ev.capacity } : {},
    ...typeof ev.public === "boolean" ? { listed: ev.public } : {}
  };
}
function descriptionText(description) {
  if (!description) return "";
  if (typeof description === "string") return stripHtml(description);
  if (typeof description.text === "string") return description.text.trim();
  if (typeof description.html === "string") return stripHtml(description.html);
  return typeof description.md === "string" ? description.md.trim() : "";
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// lib/currency.ts
var COHOST_AMOUNT = /^([A-Za-z]{3}),(\d+)$/;
function cohostToEbAmount(amount) {
  const m = COHOST_AMOUNT.exec(amount?.trim() ?? "");
  if (!m) {
    throw new Error(`invalid Cohost currency amount: ${JSON.stringify(amount)} (expected "USD,1000")`);
  }
  const currency = m[1].toUpperCase();
  const value = Number(m[2]);
  const major = value / 100;
  const majorValue = major.toFixed(2);
  return {
    currency,
    value,
    major_value: majorValue,
    display: `${majorValue} ${currency}`
  };
}
function cohostAmount(currency, minorUnits) {
  return `${currency.toUpperCase()},${Math.max(0, Math.round(minorUnits))}`;
}

// lib/orders.ts
var SOURCE2 = "eventbrite";
var EB_TO_COHOST_STATUS2 = {
  placed: "placed",
  refunded: "refunded",
  deleted: "voided",
  voided: "voided",
  cancelled: "voided",
  canceled: "voided"
};
function orderStatus(eb) {
  return EB_TO_COHOST_STATUS2[(eb.status ?? "").toLowerCase()] ?? "placed";
}
function eventbriteOrderToCohost(eb) {
  const currency = (eb.currency ?? eb.costs?.gross?.currency ?? "USD").toUpperCase();
  const c = eb.costs ?? {};
  const subtotal = c.base_price?.value ?? 0;
  const fee = (c.eventbrite_fee?.value ?? 0) + (c.payment_fee?.value ?? 0);
  const tax = c.tax?.value ?? 0;
  const gross = subtotal + fee;
  const total = gross + tax;
  const costs = {
    subtotal: cohostAmount(currency, subtotal),
    fee: cohostAmount(currency, fee),
    tax: cohostAmount(currency, tax),
    discount: cohostAmount(currency, 0),
    delivery: cohostAmount(currency, 0),
    gross: cohostAmount(currency, gross),
    preDiscount: cohostAmount(currency, gross),
    total: cohostAmount(currency, total)
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
      uid: null
    },
    items: attendeeItems(eb.attendees ?? [], currency),
    costs,
    source: SOURCE2,
    sourceId: eb.id
  };
}
function attendeeItems(attendees, currency) {
  return attendees.map((a) => {
    const quantity = a.quantity ?? 1;
    const cost = a.costs?.base_price?.value ?? 0;
    const fee = (a.costs?.eventbrite_fee?.value ?? 0) + (a.costs?.payment_fee?.value ?? 0);
    const tax = a.costs?.tax?.value ?? 0;
    const amount = (minor) => cohostAmount(currency, minor);
    return {
      ...a.id ? { id: a.id } : {},
      offeringId: a.ticket_class_id ?? "unknown",
      offeringType: "admission",
      ...a.ticket_class_name ? { name: a.ticket_class_name } : {},
      quantity,
      costs: {
        cost: amount(cost),
        fee: amount(fee),
        tax: amount(tax),
        delivery: amount(0),
        discount: amount(0),
        subtotal: amount(cost * quantity),
        gross: amount((cost + fee) * quantity),
        preDiscount: amount((cost + fee) * quantity),
        total: amount((cost + fee + tax) * quantity)
      }
    };
  });
}
var COHOST_TO_EB_STATUS = {
  placed: "placed",
  refunded: "refunded",
  voided: "deleted"
};
function cohostOrderToEventbrite(order) {
  const currency = order.currency.toUpperCase();
  const costs = {
    base_price: cohostToEbAmount(order.costs.subtotal),
    eventbrite_fee: cohostToEbAmount(order.costs.fee),
    payment_fee: { currency, value: 0, major_value: "0.00", display: `0.00 ${currency}` },
    tax: cohostToEbAmount(order.costs.tax),
    gross: cohostToEbAmount(order.costs.total)
  };
  const attendees = order.items.map((item) => ({
    ...item.id ? { id: item.id } : {},
    ticket_class_id: item.offeringId,
    quantity: item.quantity,
    ...item.name ? { ticket_class_name: item.name } : {},
    costs: {
      base_price: cohostToEbAmount(item.costs.cost),
      eventbrite_fee: cohostToEbAmount(item.costs.fee),
      tax: cohostToEbAmount(item.costs.tax),
      gross: cohostToEbAmount(item.costs.total ?? item.costs.gross)
    }
  }));
  return {
    id: order.sourceId ?? order.orderNumber,
    name: order.customer.name,
    first_name: order.customer.firstName,
    last_name: order.customer.lastName,
    email: order.customer.email ?? void 0,
    status: COHOST_TO_EB_STATUS[order.status] ?? "placed",
    currency,
    costs,
    attendees
  };
}

// lib/tickets.ts
var SOURCE3 = "eventbrite";
function ticketStatus(eb) {
  if (eb.hidden) return "hidden";
  const total = eb.quantity_total ?? null;
  const sold = eb.quantity_sold ?? 0;
  if (total !== null && total > 0 && sold >= total) return "sold-out";
  return "live";
}
function eventbriteTicketToCohost(eb, fallbackCurrency = "USD") {
  const isFree = eb.free === true || !eb.cost || (eb.cost.value ?? 0) === 0;
  const currency = (eb.cost?.currency ?? fallbackCurrency).toUpperCase();
  const name = eb.name?.trim() || "Ticket";
  const cost = cohostAmount(currency, isFree ? 0 : eb.cost?.value ?? 0);
  const zero = cohostAmount(currency, 0);
  const capacity = eb.capacity ?? eb.quantity_total;
  return {
    name,
    display_name: name,
    description: eb.description ?? void 0,
    // Cohost's ticket category, as the dashboard and the old Eventbrite importer set it.
    category: "General Admission",
    type: "admission",
    costs: { cost, fee: zero, tax: zero, delivery: zero, gross: cost, total: cost },
    ...capacity != null ? { capacity } : {},
    quantitySold: eb.quantity_sold ?? 0,
    // Cohost requires both per-order limits; Eventbrite leaves them null when unset (dashboard defaults 1/10).
    minimumQuantity: eb.minimum_quantity ?? 1,
    maximumQuantity: eb.maximum_quantity ?? 10,
    status: ticketStatus(eb),
    priceCategory: eb.donation ? "donation" : isFree ? "free" : "paid",
    ...eb.sales_start ? { salesStart: eb.sales_start } : {},
    ...eb.sales_end ? { salesEnd: eb.sales_end } : {},
    ...eb.sorting != null ? { sorting: eb.sorting } : {},
    transferable: false,
    source: SOURCE3,
    ...eb.id ? { refId: eb.id } : {}
  };
}
function cohostTicketToEventbrite(t) {
  const eventId = idFromUrn(t.urn, "events");
  const ticketClassId = idFromUrn(t.urn, "ticket_classes") ?? importedId(t);
  const pricing = t.priceCategory === "free" ? { free: true } : t.priceCategory === "donation" ? { donation: true } : { cost: cohostAmountString(t.costs?.cost ?? t.price) };
  const optional = {
    description: t.description || void 0,
    capacity: t.capacity ?? t.quantity ?? void 0,
    salesStart: t.salesStart ? ebDateTime(t.salesStart) : void 0,
    salesEnd: t.salesEnd ? ebDateTime(t.salesEnd) : void 0,
    minimumQuantity: t.minimumQuantity ?? void 0,
    maximumQuantity: t.maximumQuantity ?? void 0
  };
  return {
    ...eventId ? { eventId } : {},
    ...ticketClassId ? { ticketClassId } : {},
    name: t.display_name ?? t.name,
    ...pricing,
    hidden: t.status === "hidden",
    ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== void 0))
  };
}
function cohostAmountString(price) {
  const { currency, value } = cohostToEbAmount(price);
  return `${currency},${value}`;
}

// ../../shared/urn.ts
function validateConversionContext(context) {
  if (!context || typeof context !== "object") {
    throw new TypeError("context: Expected source identity.");
  }
  for (const key of ["companyId", "connectionId"]) {
    if (typeof context[key] !== "string" || !context[key].trim()) {
      throw new TypeError(`context.${key}: Expected a non-empty string.`);
    }
    if (!/^[A-Za-z0-9._-]+$/.test(context[key])) {
      throw new TypeError(`context.${key}: Expected letters, digits, dots, underscores, or hyphens.`);
    }
  }
}
function generateUrn(resourcePath, context) {
  validateConversionContext(context);
  if (typeof resourcePath !== "string" || !resourcePath.startsWith("/") || resourcePath === "/" || /[\s?#]/.test(resourcePath) || resourcePath.split("/").slice(1).some((segment) => !segment || segment === "." || segment === "..")) {
    throw new TypeError("resourcePath: Expected a canonical absolute resource path without a query or fragment.");
  }
  return `urn:1:${context.companyId}:${context.connectionId}:${resourcePath}`;
}

// lib/resolve.ts
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function fail(path, message) {
  throw new TypeError(`${path}: ${message}`);
}
function identify(value, path) {
  if ("ticket_class_id" in value || "profile" in value || "order_id" in value) {
    return fail(path, "Standalone attendees are not supported; provide their parent order with attendees.");
  }
  const kinds = [];
  if (isObject(value.start) || isObject(value.end) || isObject(value.name) && ("text" in value.name || "html" in value.name)) {
    kinds.push("event");
  }
  if ("cost" in value || typeof value.free === "boolean" || typeof value.donation === "boolean" || "quantity_total" in value || "on_sale_status" in value) {
    kinds.push("ticket");
  }
  if ("costs" in value || "attendees" in value && ("id" in value || "status" in value) || typeof value.email === "string" || typeof value.first_name === "string" || typeof value.last_name === "string") {
    kinds.push("order");
  }
  if (kinds.length > 1) fail(path, `Ambiguous Eventbrite object (${kinds.join(", ")}).`);
  return kinds[0];
}
function sourceId(value, path) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value === "." || value === "..") {
    fail(path, "Expected a non-empty source ID to generate a stable URN.");
  }
  return encodeURIComponent(value);
}
function mapObject(value, kind, context, currency, path, parentEventId) {
  switch (kind) {
    case "event": {
      const event = eventbriteEventToCohost(value);
      if (value.ticket_classes != null) {
        if (!Array.isArray(value.ticket_classes)) fail(`${path}.ticket_classes`, "Expected an array.");
        event.tickets = value.ticket_classes.map(
          (ticket, index) => resolveObject(ticket, context, event.currency, `${path}.ticket_classes[${index}]`, "ticket", value.id)
        );
      }
      event.urn = generateUrn(`/events/${sourceId(value.id, `${path}.id`)}`, context);
      return event;
    }
    case "ticket": {
      if (parentEventId && value.event_id != null && value.event_id !== parentEventId) {
        fail(`${path}.event_id`, "Ticket event_id does not match its parent event.");
      }
      const eventId = sourceId(value.event_id ?? parentEventId, `${path}.event_id`);
      return {
        ...eventbriteTicketToCohost(value, currency),
        urn: generateUrn(`/events/${eventId}/ticket_classes/${sourceId(value.id, `${path}.id`)}`, context),
        event_urn: generateUrn(`/events/${eventId}`, context)
      };
    }
    case "order": {
      if (value.attendees != null) {
        if (!Array.isArray(value.attendees)) fail(`${path}.attendees`, "Expected an array.");
        value.attendees.forEach((attendee, index) => {
          if (!isObject(attendee)) fail(`${path}.attendees[${index}]`, "Expected an attendee object.");
        });
      }
      const order = eventbriteOrderToCohost(value);
      if (value.event_id != null) {
        const eventPath = `/events/${sourceId(value.event_id, `${path}.event_id`)}`;
        order.event_urn = generateUrn(eventPath, context);
        order.items = order.items.map((item, index) => item.offeringId === "unknown" ? item : {
          ...item,
          offeringId: generateUrn(`${eventPath}/ticket_classes/${sourceId(item.offeringId, `${path}.items[${index}].offeringId`)}`, context)
        });
      }
      return { ...order, urn: generateUrn(`/orders/${sourceId(value.id, `${path}.id`)}`, context) };
    }
  }
}
function resolveObject(value, context, currency, path, expected, parentEventId) {
  if (!isObject(value)) fail(path, "Expected an Eventbrite object.");
  const kind = identify(value, path);
  if (!kind) fail(path, "Unrecognized Eventbrite object; expected an event, ticket class, or order.");
  if (expected && kind !== expected) fail(path, `Expected an Eventbrite ${expected}, received ${kind}.`);
  return mapObject(value, kind, context, currency, path, parentEventId);
}
function wrap(type, data) {
  return { type, urn: data.urn, data };
}
function resolve(value, context, currency, path) {
  if (Array.isArray(value)) {
    return value.map((item, index) => resolve(item, context, currency, `${path}[${index}]`));
  }
  if (!isObject(value)) fail(path, "Expected an Eventbrite object, array, or listing response.");
  const kind = identify(value, path);
  if (kind) return wrap(kind, mapObject(value, kind, context, currency, path));
  const keys = ["events", "ticket_classes", "orders"].filter((key2) => key2 in value);
  if (keys.length > 1) fail(path, "Ambiguous listing; expected exactly one of events, ticket_classes, or orders.");
  const key = keys[0];
  if (!key) fail(path, "Unrecognized Eventbrite object; expected an event, ticket class, order, or listing response.");
  const items = value[key];
  if (!Array.isArray(items)) fail(`${path}.${key}`, "Expected an array.");
  const metadata = {};
  if (value.pagination != null) {
    if (!isObject(value.pagination)) fail(`${path}.pagination`, "Expected a pagination object.");
    metadata.pagination = structuredClone(value.pagination);
  }
  switch (key) {
    case "events":
      return { events: items.map((item, index) => wrap("event", resolveObject(item, context, currency, `${path}.events[${index}]`, "event"))), ...metadata };
    case "ticket_classes":
      return { tickets: items.map((item, index) => wrap("ticket", resolveObject(item, context, currency, `${path}.ticket_classes[${index}]`, "ticket"))), ...metadata };
    case "orders":
      return { orders: items.map((item, index) => wrap("order", resolveObject(item, context, currency, `${path}.orders[${index}]`, "order"))), ...metadata };
  }
}
function eventbriteToCohost(object, context, fallbackCurrency = "USD") {
  validateConversionContext(context);
  return resolve(object, context, fallbackCurrency, "data");
}

// actions/eventbrite-to-cohost.ts
var eventbriteToCohostAction = {
  key: "eventbrite-to-cohost",
  type: "perform",
  resource: "transform",
  title: "Eventbrite \u2192 Cohost",
  description: "Detect and convert Eventbrite events, ticket classes, orders, arrays, and listings, including expanded tickets and attendees.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Eventbrite Data (JSON)", type: "json", required: true },
    { key: "companyId", label: "Company ID", type: "string", required: true, default: "{{ const.account_id }}", hint: "The Cohost company the converted objects belong to. Part of each source URN. Defaults to this account." },
    { key: "connectionId", label: "Connection ID", type: "string", required: true, hint: "The Eventbrite connection, e.g. conn_\u2026 Part of each source URN." },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for standalone tickets without a cost currency. Nested tickets use the event currency. Defaults to USD." }
  ],
  execute(input) {
    const context = input.context ?? { companyId: input.companyId, connectionId: input.connectionId };
    return eventbriteToCohost(input.data, context, input.currency ?? "USD");
  }
};
var eventbrite_to_cohost_default = eventbriteToCohostAction;

// lib/resolve-cohost.ts
function isObject2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function fail2(path, message) {
  throw new TypeError(`${path}: ${message}`);
}
function identify2(value, path) {
  if ("profile" in value || "orderItemId" in value || "offeringId" in value) {
    fail2(path, "Standalone attendees and order items are not supported; provide their parent order.");
  }
  const kinds = [];
  if (typeof value.start === "string" || typeof value.end === "string" || typeof value.tz === "string") {
    kinds.push("event");
  }
  if (typeof value.price === "string" || typeof value.priceCategory === "string" || value.type === "admission") {
    kinds.push("ticket");
  }
  if ("customer" in value || "items" in value || "orderNumber" in value || isObject2(value.costs) && typeof value.costs.subtotal === "string") {
    kinds.push("order");
  }
  if (kinds.length > 1) fail2(path, `Ambiguous Cohost object (${kinds.join(", ")}).`);
  return kinds[0];
}
function mapObject2(value, kind, fallbackCurrency, path) {
  const currency = value.currency ?? fallbackCurrency;
  if (typeof currency !== "string") fail2(`${path}.currency`, "Expected a currency string.");
  switch (kind) {
    case "event": {
      const event = cohostEventToEventbrite({ ...value, currency });
      if (value.tickets != null) {
        if (!Array.isArray(value.tickets)) fail2(`${path}.tickets`, "Expected an array.");
        event.ticketClasses = value.tickets.map(
          (ticket, index) => resolveObject2(ticket, currency, `${path}.tickets[${index}]`, "ticket")
        );
      }
      return event;
    }
    case "ticket":
      return cohostTicketToEventbrite(value);
    case "order": {
      if (!isObject2(value.customer)) fail2(`${path}.customer`, "Expected a customer object.");
      if (!isObject2(value.costs)) fail2(`${path}.costs`, "Expected order costs.");
      if (!Array.isArray(value.items)) fail2(`${path}.items`, "Expected an array.");
      value.items.forEach((item, index) => {
        if (!isObject2(item) || !isObject2(item.costs)) fail2(`${path}.items[${index}]`, "Expected an order item with costs.");
      });
      return cohostOrderToEventbrite({ ...value, currency });
    }
  }
}
function unwrap(value) {
  return isObject2(value) && typeof value.urn === "string" && isObject2(value.data) && (value.type === "event" || value.type === "ticket" || value.type === "order") ? value.data : value;
}
function resolveObject2(value, currency, path, expected) {
  value = unwrap(value);
  if (!isObject2(value)) fail2(path, "Expected a Cohost object.");
  const kind = identify2(value, path);
  if (!kind) fail2(path, "Unrecognized Cohost object; expected an event, ticket, or order.");
  if (kind !== expected) fail2(path, `Expected a Cohost ${expected}, received ${kind}.`);
  return mapObject2(value, kind, currency, path);
}
function resolve2(value, currency, path) {
  if (Array.isArray(value)) return value.map((item, index) => resolve2(item, currency, `${path}[${index}]`));
  value = unwrap(value);
  if (!isObject2(value)) fail2(path, "Expected a Cohost object, array, or listing response.");
  const kind = identify2(value, path);
  if (kind) return mapObject2(value, kind, currency, path);
  const keys = ["events", "tickets", "orders", "results"].filter((key2) => key2 in value);
  if (keys.length > 1) fail2(path, "Ambiguous listing; expected exactly one of events, tickets, orders, or results.");
  const key = keys[0];
  if (!key) fail2(path, "Unrecognized Cohost object; expected an event, ticket, order, or listing response.");
  const items = value[key];
  if (!Array.isArray(items)) fail2(`${path}.${key}`, "Expected an array.");
  const metadata = {};
  if (value.pagination != null) {
    if (!isObject2(value.pagination)) fail2(`${path}.pagination`, "Expected a pagination object.");
    metadata.pagination = structuredClone(value.pagination);
  }
  switch (key) {
    case "events":
      return { events: items.map((item, index) => resolveObject2(item, currency, `${path}.events[${index}]`, "event")), ...metadata };
    case "tickets":
      return { ticketClasses: items.map((item, index) => resolveObject2(item, currency, `${path}.tickets[${index}]`, "ticket")), ...metadata };
    case "orders":
      return { orders: items.map((item, index) => resolveObject2(item, currency, `${path}.orders[${index}]`, "order")), ...metadata };
    case "results":
      return { results: items.map((item, index) => resolve2(item, currency, `${path}.results[${index}]`)), ...metadata };
  }
}
function cohostToEventbrite(data, fallbackCurrency = "USD") {
  return resolve2(data, fallbackCurrency, "data");
}

// actions/cohost-to-eventbrite.ts
var cohostToEventbriteAction = {
  key: "cohost-to-eventbrite",
  type: "perform",
  resource: "transform",
  title: "Cohost \u2192 Eventbrite",
  description: "Detect and convert Cohost events, tickets, orders, arrays, and listings. Events and tickets become the inputs of Eventbrite's Create/Update Event and Ticket Class actions (an `eventId` / `ticketClassId` means update); orders keep Eventbrite's order shape.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Cohost Data (JSON)", type: "json", required: true },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for events and orders without a currency. Ticket prices carry their own currency. Defaults to USD." }
  ],
  execute(input) {
    return cohostToEventbrite(input.data, input.currency ?? "USD");
  }
};
var cohost_to_eventbrite_default = cohostToEventbriteAction;

// lib/resource-uri.ts
function resourcePathFromUri(resourceUri) {
  let url;
  try {
    url = new URL(resourceUri.trim());
  } catch {
    throw new TypeError(`resourceUri: Expected an Eventbrite API URL, got ${JSON.stringify(resourceUri)}.`);
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "v3") segments.shift();
  if (segments.length === 0 || segments.length % 2 !== 0) {
    throw new TypeError(`resourceUri: Expected /<collection>/<id> pairs after /v3, got ${JSON.stringify(url.pathname)}.`);
  }
  return "/" + segments.map((s) => encodeURIComponent(decodeURIComponent(s))).join("/");
}

// actions/resource-uri-to-urn.ts
var resourceUriToUrnAction = {
  key: "resource-uri-to-urn",
  type: "perform",
  resource: "transform",
  title: "Eventbrite Resource URI \u2192 URN",
  description: "Build the source URN for an Eventbrite API resource_uri \u2014 the same URN Eventbrite \u2192 Cohost stamps on the converted object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "resourceUri", label: "Resource URI", type: "string", required: true, hint: "e.g. https://www.eventbriteapi.com/v3/events/123/ticket_classes/456/" },
    { key: "companyId", label: "Company ID", type: "string", required: true, hint: "The Cohost company the URN belongs to." },
    { key: "connectionId", label: "Connection ID", type: "string", required: true, hint: "The Eventbrite connection, e.g. conn_\u2026" }
  ],
  execute(input) {
    const resourcePath = resourcePathFromUri(input.resourceUri);
    const { companyId, connectionId } = input;
    return { urn: generateUrn(resourcePath, { companyId, connectionId }), resourcePath };
  }
};
var resource_uri_to_urn_default = resourceUriToUrnAction;

// index.ts
var index_default = {
  actions: [
    eventbrite_to_cohost_default,
    cohost_to_eventbrite_default,
    resource_uri_to_urn_default
  ]
};
export {
  index_default as default
};
