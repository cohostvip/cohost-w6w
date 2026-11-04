import { CohostClient } from "../lib/client.ts";
import { pingOf } from "../lib/notification.ts";
import { ORDER_DETAILS_OUTPUT, ORDER_DETAILS_SAMPLE } from "../lib/outputs.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/** Opaque state returned by `onSubscribe`, handed back verbatim to `onUnsubscribe`. */
interface SubscriptionState {
  webhookId: string;
}

/** `/orders/<id>` → `<id>`. `resourcePath` is the one field guaranteed to name
 * the changed document (the `urn` embeds the same id, just harder to parse). */
function orderIdFromPath(resourcePath: string): string {
  const parts = resourcePath.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

/**
 * Order Changed — fires when a Cohost order changes after it was placed,
 * i.e. the platform's `order.changed` event.
 *
 * Entry point for the "sync updates" workflow: subscribe to this trigger,
 * then use `get-order` (or the enriched trigger output itself) to reconcile.
 *
 * `onSubscribe`/`onUnsubscribe` register/deregister a real webhook
 * (`POST`/`DELETE /v1/webhooks`) against `callbackUrl` — see
 * `.claude/docs/reference/webhooks.md` in the cohost monorepo. `handleIngest`
 * enriches the delivered ping into a full order via `GET /orders/{id}` —
 * see `order-placed.ts`'s matching comment for why that fetch is necessary
 * (the webhook payload itself never carries the entity, only a
 * `{changedFields}` notification).
 */
const orderChanged: TriggerDefinition<Record<string, never>, unknown, SubscriptionState> = {
  key: "order-changed",
  title: "Order Changed",
  description: "Fires when a Cohost order is changed.",
  output: ORDER_DETAILS_OUTPUT,
  sample: ORDER_DETAILS_SAMPLE,

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new CohostClient(ctx);
    const webhook = await client.request<{ id: string }>("/webhooks", {
      method: "POST",
      body: { name: "w6w: order changed", url: callbackUrl, events: ["order.changed"] },
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
  },
};

export default orderChanged;
