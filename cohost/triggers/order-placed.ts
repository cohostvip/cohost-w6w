import { type SubscriptionState, subscribeWebhook, unsubscribeWebhook } from "../lib/notification.ts";
import { ORDER_TRIGGER_OUTPUT, orderTriggerSample } from "../lib/outputs.ts";
import { type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/**
 * Order Placed — fires when a Cohost order is placed (checkout completed), i.e. the
 * platform's `order.placed` event.
 *
 * `onSubscribe`/`onUnsubscribe` register/deregister a real webhook (`POST`/`DELETE /v1/webhooks`)
 * against `callbackUrl` — see `.claude/docs/reference/webhooks.md` in the cohost monorepo for the
 * delivery pipeline this lands on (`triggeredEvents` → `deliverWebhooks`, HMAC-signed via
 * `X-Cohost-Signature`).
 *
 * Sends the unified trigger payload (`lib/payload.ts`): `data` is the order (fetched via
 * `GET /orders/{id}` — the webhook is only a notification), `meta.transactions` its payments,
 * `meta.changedFields` what changed.
 */
const orderPlaced: TriggerDefinition<Record<string, never>, TriggerPayload, SubscriptionState> = {
  key: "order-placed",
  title: "Order Placed",
  description: "Fires when a Cohost order is placed.",
  output: ORDER_TRIGGER_OUTPUT,
  sample: orderTriggerSample("order.placed"),

  onSubscribe({ callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: order placed", callbackUrl, ["order.placed"]);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  },
};

export default orderPlaced;
