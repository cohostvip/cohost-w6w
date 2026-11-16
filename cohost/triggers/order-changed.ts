import { type SubscriptionState, subscribeWebhook, unsubscribeWebhook } from "../lib/notification.ts";
import { ORDER_TRIGGER_OUTPUT, orderTriggerSample } from "../lib/outputs.ts";
import { type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/**
 * Order Changed — fires when a Cohost order changes after it was placed, i.e. the platform's
 * `order.changed` event. Entry point for the "sync updates" workflow.
 *
 * Sends the unified trigger payload (`lib/payload.ts`): `data` is the order (fetched via
 * `GET /orders/{id}` — the webhook is only a notification), `meta.transactions` its payments,
 * `meta.changedFields` what changed.
 */
const orderChanged: TriggerDefinition<Record<string, never>, TriggerPayload, SubscriptionState> = {
  key: "order-changed",
  title: "Order Changed",
  description: "Fires when a Cohost order is changed.",
  output: ORDER_TRIGGER_OUTPUT,
  sample: orderTriggerSample("order.changed", ["status"]),

  onSubscribe({ callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: order changed", callbackUrl, ["order.changed"]);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  },
};

export default orderChanged;
