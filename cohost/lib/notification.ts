import { CohostClient } from "./client.ts";
import type { HookContext, OutputField } from "@w6w/types";

/** The shape `deliverWebhooks` (cohost's dispatcher) actually POSTs — a
 * notification, not the entity itself. */
export interface WebhookPing {
  id: string;
  action: string;
  timestamp: string;
  urn: string;
  context: { companyId: string; service: string; resourcePath: string };
  data?: { changedFields?: string[] };
}

/** What the change triggers hand to the workflow: which object changed and how. */
export interface ChangeNotification {
  /** The changed object's URN. */
  urn: string;
  /** Object type, the webhook event's prefix: `event`, `offering`, `order`, `attendee`. */
  type: string;
  /** What happened, the webhook event's suffix: `created`, `updated`, `deleted`, … */
  action: string;
  /** The full Cohost webhook event, e.g. `event.updated`. */
  webhookEvent: string;
  /** The changed object's own id (last path segment). */
  id: string;
  /** The parent event's id, for an event or anything nested under one. */
  eventId?: string;
  resourcePath: string;
  companyId: string;
  /** Changed top-level keys plus every changed dotted path under them: `["costs", "costs.tax"]`. */
  changedFields: string[];
  timestamp: string;
}

/** The ping in a `handleIngest` `raw`: w6w hands the hook the whole inbound call, body included. */
export function pingOf(raw: unknown): WebhookPing {
  return (raw as { body: WebhookPing }).body;
}

/** Turn a delivered webhook call into a {@link ChangeNotification}. */
export function toNotification(raw: unknown): ChangeNotification {
  const ping = pingOf(raw);
  const dot = ping.action.indexOf(".");
  const segments = ping.context.resourcePath.split("/").filter(Boolean);
  return {
    urn: ping.urn,
    type: ping.action.slice(0, dot),
    action: ping.action.slice(dot + 1),
    webhookEvent: ping.action,
    id: segments[segments.length - 1],
    ...(segments[0] === "events" && segments[1] ? { eventId: segments[1] } : {}),
    resourcePath: ping.context.resourcePath,
    companyId: ping.context.companyId,
    changedFields: ping.data?.changedFields ?? [],
    timestamp: ping.timestamp,
  };
}

/** Editor autocomplete for {@link ChangeNotification}. */
export const notificationOutput: OutputField[] = [
  { key: "urn", type: "string", label: "URN" },
  { key: "type", type: "string", label: "Type" },
  { key: "action", type: "string", label: "Action" },
  { key: "webhookEvent", type: "string", label: "Webhook Event" },
  { key: "id", type: "string", label: "ID" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "resourcePath", type: "string", label: "Resource Path" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "changedFields", type: "array", label: "Changed Fields (e.g. costs, costs.tax)" },
  { key: "timestamp", type: "string", label: "Timestamp" },
];

/** Opaque state returned by `onSubscribe`, handed back verbatim to `onUnsubscribe`. */
export interface SubscriptionState {
  webhookId: string;
}

/** Register one Cohost webhook for `events` against the runtime's `callbackUrl`. */
export async function subscribeWebhook(
  ctx: HookContext,
  name: string,
  callbackUrl: string,
  events: string[],
): Promise<SubscriptionState> {
  const client = new CohostClient(ctx);
  const webhook = await client.request<{ id: string }>("/webhooks", {
    method: "POST",
    body: { name, url: callbackUrl, events },
  });
  return { webhookId: webhook.id };
}

export async function unsubscribeWebhook(
  ctx: HookContext,
  state: SubscriptionState,
): Promise<void> {
  const client = new CohostClient(ctx);
  await client.request(`/webhooks/${encodeURIComponent(state.webhookId)}`, { method: "DELETE" });
}

/** The `field` multiselect's values (or `fallback` when none were picked), checked against `allowed`. */
export function pickValues(
  field: string,
  values: unknown,
  allowed: readonly string[],
  fallback: readonly string[],
): string[] {
  const picked = Array.isArray(values) && values.length > 0 ? values.map(String) : [...fallback];
  const unknown = picked.filter((v) => !allowed.includes(v));
  if (unknown.length > 0) {
    throw new TypeError(`${field}: Unknown value(s) ${unknown.join(", ")}; expected ${allowed.join(", ")}.`);
  }
  return picked;
}
