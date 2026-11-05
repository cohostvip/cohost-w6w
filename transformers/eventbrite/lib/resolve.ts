import { eventbriteEventToCohost } from "./events.ts";
import { eventbriteOrderToCohost } from "./orders.ts";
import { eventbriteTicketToCohost } from "./tickets.ts";
import { generateUrn, validateConversionContext } from "../../../shared/urn.ts";
import type { ConversionContext } from "../../../shared/context.ts";
import type { CohostEvent, CohostOrder, CohostTicket, EbEvent, EbOrder, EbTicketClass } from "./types.ts";

export type Kind = "event" | "ticket" | "order";
type JsonObject = Record<string, unknown>;
type Pagination = { pagination?: JsonObject };

/** One converted object: its kind, its source URN, and the Cohost object itself. */
export type Converted<K extends Kind = Kind> = {
  type: K;
  urn: string;
  data: { event: CohostEvent; ticket: CohostTicket; order: CohostOrder }[K];
};

export type EventbriteToCohostResult =
  | Converted
  | ({ events: Converted<"event">[] } & Pagination)
  | ({ tickets: Converted<"ticket">[] } & Pagination)
  | ({ orders: Converted<"order">[] } & Pagination)
  | EventbriteToCohostResult[];

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

/** Detect by field structure, never by IDs or external URLs. */
function identify(value: JsonObject, path: string): Kind | undefined {
  // Attendees also have costs, but cannot be mapped as standalone orders.
  if ("ticket_class_id" in value || "profile" in value || "order_id" in value) {
    return fail(path, "Standalone attendees are not supported; provide their parent order with attendees.");
  }

  const kinds: Kind[] = [];
  if (isObject(value.start) || isObject(value.end) ||
      (isObject(value.name) && ("text" in value.name || "html" in value.name))) {
    kinds.push("event");
  }
  if ("cost" in value || typeof value.free === "boolean" || typeof value.donation === "boolean" ||
      "quantity_total" in value || "on_sale_status" in value) {
    kinds.push("ticket");
  }
  if ("costs" in value || ("attendees" in value && ("id" in value || "status" in value)) || typeof value.email === "string" ||
      typeof value.first_name === "string" || typeof value.last_name === "string") {
    kinds.push("order");
  }
  if (kinds.length > 1) fail(path, `Ambiguous Eventbrite object (${kinds.join(", ")}).`);
  return kinds[0];
}

function sourceId(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value === "." || value === "..") {
    fail(path, "Expected a non-empty source ID to generate a stable URN.");
  }
  return encodeURIComponent(value);
}

function mapObject(value: JsonObject, kind: Kind, context: ConversionContext, currency: string, path: string, parentEventId?: string): CohostEvent | CohostTicket | CohostOrder {
  switch (kind) {
    case "event": {
      const event = eventbriteEventToCohost(value as EbEvent);
      if (value.ticket_classes != null) {
        if (!Array.isArray(value.ticket_classes)) fail(`${path}.ticket_classes`, "Expected an array.");
        event.tickets = value.ticket_classes.map((ticket, index) =>
          resolveObject(ticket, context, event.currency, `${path}.ticket_classes[${index}]`, "ticket", value.id as string | undefined) as CohostTicket,
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
        ...eventbriteTicketToCohost(value as EbTicketClass, currency),
        urn: generateUrn(`/events/${eventId}/ticket_classes/${sourceId(value.id, `${path}.id`)}`, context),
        event_urn: generateUrn(`/events/${eventId}`, context),
      };
    }
    case "order": {
      if (value.attendees != null) {
        if (!Array.isArray(value.attendees)) fail(`${path}.attendees`, "Expected an array.");
        value.attendees.forEach((attendee, index) => {
          if (!isObject(attendee)) fail(`${path}.attendees[${index}]`, "Expected an attendee object.");
        });
      }
      const order = eventbriteOrderToCohost(value as EbOrder);
      if (value.event_id != null) {
        const eventPath = `/events/${sourceId(value.event_id, `${path}.event_id`)}`;
        // Eventbrite's `event_id` → the event's URN, and each item's ticket class → that ticket's URN,
        // so a sync can resolve them to the Cohost event and its tickets.
        order.event_urn = generateUrn(eventPath, context);
        order.items = order.items.map((item, index) => item.offeringId === "unknown" ? item : {
          ...item,
          offeringId: generateUrn(`${eventPath}/ticket_classes/${sourceId(item.offeringId, `${path}.items[${index}].offeringId`)}`, context),
        });
      }
      return { ...order, urn: generateUrn(`/orders/${sourceId(value.id, `${path}.id`)}`, context) };
    }
  }
}

function resolveObject(value: unknown, context: ConversionContext, currency: string, path: string, expected?: Kind, parentEventId?: string): CohostEvent | CohostTicket | CohostOrder {
  if (!isObject(value)) fail(path, "Expected an Eventbrite object.");
  const kind = identify(value, path);
  if (!kind) fail(path, "Unrecognized Eventbrite object; expected an event, ticket class, or order.");
  if (expected && kind !== expected) fail(path, `Expected an Eventbrite ${expected}, received ${kind}.`);
  return mapObject(value, kind, context, currency, path, parentEventId);
}

function wrap<K extends Kind>(type: K, data: CohostEvent | CohostTicket | CohostOrder): Converted<K> {
  return { type, urn: data.urn as string, data } as Converted<K>;
}

function resolve(value: unknown, context: ConversionContext, currency: string, path: string): EventbriteToCohostResult {
  if (Array.isArray(value)) {
    return value.map((item, index) => resolve(item, context, currency, `${path}[${index}]`));
  }
  if (!isObject(value)) fail(path, "Expected an Eventbrite object, array, or listing response.");
  const kind = identify(value, path);
  if (kind) return wrap(kind, mapObject(value, kind, context, currency, path));

  const keys = (["events", "ticket_classes", "orders"] as const).filter(key => key in value);
  if (keys.length > 1) fail(path, "Ambiguous listing; expected exactly one of events, ticket_classes, or orders.");
  const key = keys[0];
  if (!key) fail(path, "Unrecognized Eventbrite object; expected an event, ticket class, order, or listing response.");
  const items = value[key];
  if (!Array.isArray(items)) fail(`${path}.${key}`, "Expected an array.");
  const metadata: Pagination = {};
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

/**
 * Resolve singular objects, arrays, and API listings, including expanded event tickets and order attendees.
 * Every converted object comes back as `{ type, urn, data }` — singular inputs, array items, and listing
 * items alike — so `.urn` and `.type` are always at the same place. An event's expanded ticket classes
 * stay inside it as `data.tickets`.
 */
export function eventbriteToCohost(object: unknown, context: ConversionContext, fallbackCurrency = "USD"): EventbriteToCohostResult {
  validateConversionContext(context);
  return resolve(object, context, fallbackCurrency, "data");
}
