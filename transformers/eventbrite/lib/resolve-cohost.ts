import { cohostEventToEventbrite } from "./events.ts";
import { cohostOrderToEventbrite } from "./orders.ts";
import { cohostTicketToEventbrite } from "./tickets.ts";
import type { CohostEvent, CohostOrder, CohostTicket, EbEvent, EbOrder, EbTicketClass } from "./types.ts";

type Kind = "event" | "ticket" | "order";
type JsonObject = Record<string, unknown>;
type Pagination = { pagination?: JsonObject };
type EbObject = EbEvent | EbTicketClass | EbOrder;

export type CohostToEventbriteResult =
  | EbObject
  | ({ events: EbEvent[] } & Pagination)
  | ({ ticket_classes: EbTicketClass[] } & Pagination)
  | ({ orders: EbOrder[] } & Pagination)
  | ({ results: CohostToEventbriteResult[] } & Pagination)
  | CohostToEventbriteResult[];

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

/** Cohost uses scalar event times, currency strings on tickets, and order items. */
function identify(value: JsonObject, path: string): Kind | undefined {
  if ("profile" in value || "orderItemId" in value || "offeringId" in value) {
    fail(path, "Standalone attendees and order items are not supported; provide their parent order.");
  }
  const kinds: Kind[] = [];
  if (typeof value.start === "string" || typeof value.end === "string" || typeof value.tz === "string") {
    kinds.push("event");
  }
  if (typeof value.price === "string" || typeof value.priceCategory === "string" || value.type === "admission") {
    kinds.push("ticket");
  }
  if ("customer" in value || "items" in value || "orderNumber" in value ||
      (isObject(value.costs) && typeof value.costs.subtotal === "string")) {
    kinds.push("order");
  }
  if (kinds.length > 1) fail(path, `Ambiguous Cohost object (${kinds.join(", ")}).`);
  return kinds[0];
}

function mapObject(value: JsonObject, kind: Kind, fallbackCurrency: string, path: string): EbObject {
  const currency = value.currency ?? fallbackCurrency;
  if (typeof currency !== "string") fail(`${path}.currency`, "Expected a currency string.");
  switch (kind) {
    case "event": {
      const event = cohostEventToEventbrite({ ...value, currency } as CohostEvent);
      if (value.tickets != null) {
        if (!Array.isArray(value.tickets)) fail(`${path}.tickets`, "Expected an array.");
        event.ticket_classes = value.tickets.map((ticket, index) =>
          resolveObject(ticket, currency, `${path}.tickets[${index}]`, "ticket") as EbTicketClass,
        );
      }
      return event;
    }
    case "ticket":
      return cohostTicketToEventbrite(value as unknown as CohostTicket);
    case "order": {
      if (!isObject(value.customer)) fail(`${path}.customer`, "Expected a customer object.");
      if (!isObject(value.costs)) fail(`${path}.costs`, "Expected order costs.");
      if (!Array.isArray(value.items)) fail(`${path}.items`, "Expected an array.");
      value.items.forEach((item, index) => {
        if (!isObject(item) || !isObject(item.costs)) fail(`${path}.items[${index}]`, "Expected an order item with costs.");
      });
      return cohostOrderToEventbrite({ ...value, currency } as unknown as CohostOrder);
    }
  }
}

function resolveObject(value: unknown, currency: string, path: string, expected: Kind): EbObject {
  if (!isObject(value)) fail(path, "Expected a Cohost object.");
  const kind = identify(value, path);
  if (!kind) fail(path, "Unrecognized Cohost object; expected an event, ticket, or order.");
  if (kind !== expected) fail(path, `Expected a Cohost ${expected}, received ${kind}.`);
  return mapObject(value, kind, currency, path);
}

function resolve(value: unknown, currency: string, path: string): CohostToEventbriteResult {
  if (Array.isArray(value)) return value.map((item, index) => resolve(item, currency, `${path}[${index}]`));
  if (!isObject(value)) fail(path, "Expected a Cohost object, array, or listing response.");
  const kind = identify(value, path);
  if (kind) return mapObject(value, kind, currency, path);

  const keys = (["events", "tickets", "orders", "results"] as const).filter(key => key in value);
  if (keys.length > 1) fail(path, "Ambiguous listing; expected exactly one of events, tickets, orders, or results.");
  const key = keys[0];
  if (!key) fail(path, "Unrecognized Cohost object; expected an event, ticket, order, or listing response.");
  const items = value[key];
  if (!Array.isArray(items)) fail(`${path}.${key}`, "Expected an array.");
  const metadata: Pagination = {};
  if (value.pagination != null) {
    if (!isObject(value.pagination)) fail(`${path}.pagination`, "Expected a pagination object.");
    metadata.pagination = structuredClone(value.pagination);
  }
  switch (key) {
    case "events":
      return { events: items.map((item, index) => resolveObject(item, currency, `${path}.events[${index}]`, "event") as EbEvent), ...metadata };
    case "tickets":
      return { ticket_classes: items.map((item, index) => resolveObject(item, currency, `${path}.tickets[${index}]`, "ticket") as EbTicketClass), ...metadata };
    case "orders":
      return { orders: items.map((item, index) => resolveObject(item, currency, `${path}.orders[${index}]`, "order") as EbOrder), ...metadata };
    case "results":
      return { results: items.map((item, index) => resolve(item, currency, `${path}.results[${index}]`)), ...metadata };
  }
}

/** Resolve Cohost objects and collections, including event tickets and order items. */
export function cohostToEventbrite(data: unknown, fallbackCurrency = "USD"): CohostToEventbriteResult {
  return resolve(data, fallbackCurrency, "data");
}
