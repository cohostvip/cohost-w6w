import { CohostClient } from "./client.ts";
import type { HookContext } from "@w6w/types";

/** The shape `deliverWebhooks` (cohost's dispatcher) actually POSTs — a
 * notification, not the entity itself. Triggers turn it into a `TriggerPayload` (`payload.ts`). */
export interface WebhookPing {
  id: string;
  action: string;
  timestamp: string;
  urn: string;
  context: { companyId: string; service: string; resourcePath: string };
  data?: {
    changedFields?: string[];
    /** `channelEvent.*` only: the values the channel keeps on the listing (e.g. a synced id). */
    properties?: Record<string, string | number | boolean>;
  };
}

/** The ping in a `handleIngest` `raw`: w6w hands the hook the whole inbound call, body included. */
export function pingOf(raw: unknown): WebhookPing {
  return (raw as { body: WebhookPing }).body;
}

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
