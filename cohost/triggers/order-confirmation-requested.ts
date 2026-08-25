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
 * Order Confirmation Requested — fires when Cohost decides an order needs a
 * confirmation email, i.e. the platform's `order.confirmation-requested`
 * event. NOT the same as `order.placed`: this is a narrower, purpose-built
 * signal (`functions/messaging/src/hooks/orders/confirmation.ts` in the
 * cohost monorepo) that a confirmation is due right now — an order can be
 * placed without this firing (no customer email on file), and this is the
 * ONLY trigger that lines up with the real "send confirmation email"
 * workflow (`wf_jb_send_emails-2` in the legacy engine) — `order.placed` was
 * this app's earlier guess at the entry point and is one hop too early.
 *
 * `onSubscribe`/`onUnsubscribe` register/deregister a real webhook
 * (`POST`/`DELETE /v1/webhooks`) against `callbackUrl` — see
 * `.claude/docs/reference/webhooks.md` in the cohost monorepo.
 * `handleIngest` enriches the delivered ping into a full order via
 * `GET /orders/{id}` — see `order-placed.ts`'s matching comment for why.
 *
 * The legacy `wf_jb_send_emails-2` workflow's own "source filter" (skip a
 * single-source order) is a w6w-side workflow utility, not a cohost concern —
 * out of scope for this app; nothing here needs to reproduce it.
 */
const orderConfirmationRequested: TriggerDefinition<Record<string, never>, unknown, SubscriptionState> = {
  key: "order-confirmation-requested",
  title: "Order Confirmation Requested",
  description: "Fires when Cohost determines an order confirmation email is due.",
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
      body: {
        name: "w6w: order confirmation requested",
        url: callbackUrl,
        events: ["order.confirmation-requested"],
      },
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

export default orderConfirmationRequested;
