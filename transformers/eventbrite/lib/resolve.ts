import { eventbriteEventToCohost } from "./events.ts";
import { eventbriteOrderAttendees, eventbriteOrderSource, eventbriteOrderToCohost } from "./orders.ts";
import { eventbriteTicketToCohost } from "./tickets.ts";
import { generateUrn, validateConversionContext } from "../../../shared/urn.ts";
import type { ConversionContext } from "../../../shared/context.ts";
import type { CohostEvent, CohostOrderPayload, CohostTicket, EbEvent, EbOrder, EbTicketClass } from "./types.ts";

export type Kind = "event" | "ticket" | "order";
type JsonObject = Record<string, unknown>;
type Pagination = { pagination?: JsonObject };

/**
 * One converted object: its kind, its source URN, and the Cohost object itself. An order's
 * `data` is the whole `POST /v1/orders` body (`{ order, source, attendees? }`), not the bare order.
 */
export type Converted<K extends Kind = Kind> = {
  type: K;
  urn: string;
  data: { event: CohostEvent; ticket: CohostTicket; order: CohostOrderPayload }[K];
};

export interface ConversionOptions {
  /**
   * Enrich orders for an insert: add the ticket holders (`attendees`: profile, barcodes,
   * check-in, status) next to the order. Off by default.
   */
  enrich?: boolean;
}

type Mapped = CohostEvent | CohostTicket | CohostOrderPayload;
type Settings = { context: ConversionContext; currency: string; enrich: boolean };

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

function mapObject(value: JsonObject, kind: Kind, settings: Settings, path: string, parentEventId?: string): Mapped {
  const { context, currency } = settings;
  switch (kind) {
    case "event": {
      const event = eventbriteEventToCohost(value as EbEvent);
      if (value.ticket_classes != null) {
        if (!Array.isArray(value.ticket_classes)) fail(`${path}.ticket_classes`, "Expected an array.");
        event.tickets = value.ticket_classes.map((ticket, index) =>
          resolveObject(ticket, { ...settings, currency: event.currency }, `${path}.ticket_classes[${index}]`, "ticket", value.id as string | undefined) as CohostTicket,
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
      const orderPath = `/orders/${sourceId(value.id, `${path}.id`)}`;
      let eventPath: string | undefined;
      if (value.event_id != null) {
        eventPath = `/events/${sourceId(value.event_id, `${path}.event_id`)}`;
        // Eventbrite's `event_id` → the event's URN, and each item's ticket class → that ticket's URN,
        // so a sync can resolve them to the Cohost event and its tickets. `contextId` carries the same
        // URN for `POST /v1/orders`, which resolves it through the event's mapping.
        order.event_urn = generateUrn(eventPath, context);
        order.contextId = order.event_urn;
        order.items = order.items.map((item, index) => item.offeringId === "unknown" ? item : {
          ...item,
          offeringId: generateUrn(`${eventPath}/ticket_classes/${sourceId(item.offeringId, `${path}.items[${index}].offeringId`)}`, context),
        });
      }
      order.urn = generateUrn(orderPath, context);
      const payload: CohostOrderPayload = { order, source: eventbriteOrderSource(value as EbOrder, order.urn) };
      if (settings.enrich) {
        payload.attendees = eventbriteOrderAttendees(value as EbOrder, (attendeeId) =>
          generateUrn(`${eventPath ?? orderPath}/attendees/${sourceId(attendeeId, `${path}.attendees.id`)}`, context));
      }
      return payload;
    }
  }
}

function resolveObject(value: unknown, settings: Settings, path: string, expected?: Kind, parentEventId?: string): Mapped {
  if (!isObject(value)) fail(path, "Expected an Eventbrite object.");
  const kind = identify(value, path);
  if (!kind) fail(path, "Unrecognized Eventbrite object; expected an event, ticket class, or order.");
  if (expected && kind !== expected) fail(path, `Expected an Eventbrite ${expected}, received ${kind}.`);
  return mapObject(value, kind, settings, path, parentEventId);
}

function wrap<K extends Kind>(type: K, data: Mapped): Converted<K> {
  const urn = type === "order" ? (data as CohostOrderPayload).order.urn : (data as CohostEvent | CohostTicket).urn;
  return { type, urn: urn as string, data } as Converted<K>;
}

function resolve(value: unknown, settings: Settings, path: string): EventbriteToCohostResult {
  if (Array.isArray(value)) {
    return value.map((item, index) => resolve(item, settings, `${path}[${index}]`));
  }
  if (!isObject(value)) fail(path, "Expected an Eventbrite object, array, or listing response.");
  const kind = identify(value, path);
  if (kind) return wrap(kind, mapObject(value, kind, settings, path));

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
      return { events: items.map((item, index) => wrap("event", resolveObject(item, settings, `${path}.events[${index}]`, "event"))), ...metadata };
    case "ticket_classes":
      return { tickets: items.map((item, index) => wrap("ticket", resolveObject(item, settings, `${path}.ticket_classes[${index}]`, "ticket"))), ...metadata };
    case "orders":
      return { orders: items.map((item, index) => wrap("order", resolveObject(item, settings, `${path}.orders[${index}]`, "order"))), ...metadata };
  }
}

/**
 * Resolve singular objects, arrays, and API listings, including expanded event tickets and order attendees.
 * Every converted object comes back as `{ type, urn, data }` — singular inputs, array items, and listing
 * items alike — so `.urn` and `.type` are always at the same place. An event's expanded ticket classes
 * stay inside it as `data.tickets`; an order's `data` is `{ order, source, attendees? }`, the body of
 * `POST /v1/orders`.
 */
export function eventbriteToCohost(
  object: unknown,
  context: ConversionContext,
  fallbackCurrency = "USD",
  options: ConversionOptions = {},
): EventbriteToCohostResult {
  validateConversionContext(context);
  return resolve(object, { context, currency: fallbackCurrency, enrich: options.enrich === true }, "data");
}
