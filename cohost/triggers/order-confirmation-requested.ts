import { type SubscriptionState, subscribeWebhook, unsubscribeWebhook } from "../lib/notification.ts";
import { ORDER_TRIGGER_OUTPUT, orderTriggerSample } from "../lib/outputs.ts";
import { type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/**
 * Order Confirmation Requested — fires when Cohost decides an order needs a confirmation email,
 * i.e. the platform's `order.confirmation-requested` event. NOT the same as `order.placed`: a
 * narrower, purpose-built signal (`functions/messaging/src/hooks/orders/confirmation.ts` in the
 * cohost monorepo) that a confirmation is due right now — an order can be placed without this
 * firing (no customer email on file). It lines up with the legacy "send confirmation email"
 * workflow (`wf_jb_send_emails-2`); that workflow's own "source filter" is a w6w-side concern.
 *
 * Sends the unified trigger payload (`lib/payload.ts`): `data` is the order (fetched via
 * `GET /orders/{id}` — the webhook is only a notification), `meta.transactions` its payments,
 * `meta.changedFields` what changed.
 */
const orderConfirmationRequested: TriggerDefinition<Record<string, never>, TriggerPayload, SubscriptionState> = {
  key: "order-confirmation-requested",
  title: "Order Confirmation Requested",
  description: "Fires when Cohost determines an order confirmation email is due.",
  output: ORDER_TRIGGER_OUTPUT,
  sample: orderTriggerSample("order.confirmation-requested"),

  onSubscribe({ callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: order confirmation requested", callbackUrl, ["order.confirmation-requested"]);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  },
};

export default orderConfirmationRequested;
