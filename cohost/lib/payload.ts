import type { HookContext } from "@w6w/types";
import { CohostClient } from "./client.ts";
import { pingOf } from "./notification.ts";

/**
 * The ONE shape every Cohost trigger hands a workflow — order, event, ticket, attendee and the
 * general object trigger alike — so a workflow never has to guess where a field lives:
 *
 * ```jsonc
 * {
 *   "urn": "urn:1:co_1:cohost-falcon:/orders/ord_1", // the object that changed
 *   "action": "order.placed",                         // the Cohost event: <type>.<what happened>
 *   "type": "order",                                  // event | offering | order | attendee
 *   "id": "ord_1",                                    // the object's own id
 *   "timestamp": "2026-11-01T20:34:10.000Z",          // when it happened (UTC)
 *   "data": { ... },                                  // the object itself; null once deleted
 *   "meta": {
 *     "changedFields": ["costs", "costs.total"],      // what changed ([] when not an update)
 *     "companyId": "co_1",
 *     "eventId": "ev_1",                              // its event (null when it has none)
 *     "resourcePath": "/orders/ord_1",
 *     "deliveryId": "trg_1",                          // Cohost's id for this delivery (dedupe key)
 *     "transactions": [ ... ]                         // orders only: the payment transactions
 *   }
 * }
 * ```
 *
 * `data` is the object exactly as its `get-*` action returns it (`get-event`, `get-event-ticket`,
 * `get-event-attendee`, and `get-order`'s `order`), fetched when the trigger fires — Cohost's
 * webhook is only a notification and never carries the object.
 */
export interface TriggerPayload<T = unknown> {
  urn: string;
  action: string;
  type: string;
  id: string;
  timestamp: string;
  data: T | null;
  meta: TriggerMeta;
}

export interface TriggerMeta {
  /** Changed top-level keys plus every changed dotted path under them: `["costs", "costs.tax"]`. */
  changedFields: string[];
  companyId: string;
  /** The event the object is (or belongs to); `null` when it has none. */
  eventId: string | null;
  resourcePath: string;
  /** Cohost's id for this webhook delivery. */
  deliveryId: string;
  /** Orders only: the order's payment transactions. */
  transactions?: unknown[];
}

/** `GET /orders/{id}` — the order plus its payment records. */
interface OrderDetails {
  order?: { contextId?: string } & Record<string, unknown>;
  transactions?: unknown[];
}

/** Fetch the changed object; `null` when there is nothing to fetch (deleted, or no parent event). */
async function fetchObject(
  client: CohostClient,
  type: string,
  id: string,
  eventId: string | null,
): Promise<{ data: unknown; transactions?: unknown[] }> {
  const enc = encodeURIComponent;
  switch (type) {
    case "event":
      return { data: await client.request(`/events/${enc(id)}`) };
    case "offering":
      return { data: eventId ? await client.request(`/events/${enc(eventId)}/tickets/${enc(id)}`) : null };
    case "attendee":
      return { data: eventId ? await client.request(`/events/${enc(eventId)}/attendees/${enc(id)}`) : null };
    case "order": {
      const details = await client.request<OrderDetails>(`/orders/${enc(id)}`);
      // `OrderDetails` wraps the order; tolerate a bare order rather than dropping it.
      const order = details && typeof details === "object" && "order" in details ? details.order : details;
      return { data: order ?? null, transactions: details?.transactions ?? [] };
    }
    default:
      return { data: null };
  }
}

/** Turn a delivered Cohost webhook call into the unified {@link TriggerPayload}, fetching the object. */
export async function toPayload(raw: unknown, ctx: HookContext): Promise<TriggerPayload> {
  const ping = pingOf(raw);
  const dot = ping.action.indexOf(".");
  const type = dot > 0 ? ping.action.slice(0, dot) : ping.action;
  const what = dot > 0 ? ping.action.slice(dot + 1) : "";
  const segments = ping.context.resourcePath.split("/").filter(Boolean);
  const id = segments[segments.length - 1];
  let eventId = segments[0] === "events" && segments[1] ? segments[1] : null;

  const { data, transactions } = what === "deleted"
    ? { data: null, transactions: type === "order" ? [] : undefined }
    : await fetchObject(new CohostClient(ctx), type, id, eventId);

  // An order is not nested under its event; its `contextId` (`evt_<id>`) names it.
  const contextId = type === "order" ? (data as OrderDetails["order"])?.contextId : undefined;
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
      ...(transactions ? { transactions } : {}),
    },
  };
}
