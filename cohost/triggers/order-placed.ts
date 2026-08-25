import { CohostClient } from "../lib/client.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/** Opaque state returned by `onSubscribe`, handed back verbatim to `onUnsubscribe`. */
interface SubscriptionState {
  webhookId: string;
}

/** The shape `deliverWebhooks` (cohost's dispatcher) actually POSTs — a
 * notification, not the entity itself. See `handleIngest` below for why. */
interface WebhookPing {
  id: string;
  action: string;
  timestamp: string;
  urn: string;
  context: { companyId: string; service: string; resourcePath: string };
  data?: { changedFields?: string[] };
}

/** `/orders/<id>` → `<id>`. `resourcePath` is the one field guaranteed to name
 * the changed document (the `urn` embeds the same id, just harder to parse). */
function orderIdFromPath(resourcePath: string): string {
  const parts = resourcePath.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

/**
 * Order Placed — fires when a Cohost order is placed (checkout completed),
 * i.e. the platform's `order.placed` event.
 *
 * Entry point for the "send confirmation email" workflow: subscribe to this
 * trigger, then use `get-order` to fetch the order and send.
 *
 * `onSubscribe`/`onUnsubscribe` register/deregister a real webhook
 * (`POST`/`DELETE /v1/webhooks`) against `callbackUrl` — see
 * `.claude/docs/reference/webhooks.md` in the cohost monorepo for the
 * delivery pipeline this lands on (`triggeredEvents` →
 * `deliverWebhooks`, HMAC-signed via `X-Cohost-Signature`).
 *
 * `handleIngest` does NOT pass the raw webhook body through: `deliverWebhooks`
 * sends a PING (`{id, action, urn, context, data?: {changedFields}}`), never
 * the order itself (`WebhookPayload.data` only ever carries `changedFields` —
 * see `packages/domains/bll/webhooks/src/service.ts#resolveForEvent`). This
 * fetches the real order via `GET /orders/{id}` (the same call `get-order`
 * makes) so the trigger's declared `output` is actually populated, not a
 * best-effort guess from a notification payload.
 */
const orderPlaced: TriggerDefinition<Record<string, never>, unknown, SubscriptionState> = {
  key: "order-placed",
  title: "Order Placed",
  description: "Fires when a Cohost order is placed.",
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "orderNumber", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "organizerId", type: "string", label: "Organizer ID" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "items", type: "array", label: "Items" },
    { key: "costs", type: "object", label: "Costs" },
  ],

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new CohostClient(ctx);
    const webhook = await client.request<{ id: string }>("/webhooks", {
      method: "POST",
      body: { name: "w6w: order placed", url: callbackUrl, events: ["order.placed"] },
    });
    return { webhookId: webhook.id };
  },

  async onUnsubscribe({ state }, ctx) {
    const client = new CohostClient(ctx);
    await client.request(`/webhooks/${encodeURIComponent(state.webhookId)}`, { method: "DELETE" });
  },

  async handleIngest({ raw }, ctx) {
    const ping = raw as WebhookPing;
    const orderId = orderIdFromPath(ping.context.resourcePath);
    const client = new CohostClient(ctx);
    const order = await client.request(`/orders/${encodeURIComponent(orderId)}`);
    return [order];
  },
};

export default orderPlaced;
