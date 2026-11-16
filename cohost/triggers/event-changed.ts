import {
  pickValues,
  type SubscriptionState,
  subscribeWebhook,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { EVENT_CHANGED_OUTPUT, EVENT_CHANGED_SAMPLE } from "../lib/outputs.ts";
import { type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

const ACTIONS = ["created", "updated", "deleted", "published"] as const;
const DEFAULT_ACTIONS = ["created", "updated", "deleted"] as const;

interface Params {
  actions?: string[];
}

/**
 * Event Changed — fires when a Cohost event is created, updated, deleted or
 * published (the platform's `event.*` webhook events).
 *
 * Cohost fires `event.changed` alongside every `event.updated`, so only
 * `updated` is offered — subscribing to both would deliver each update twice.
 *
 * Sends the unified trigger payload (`lib/payload.ts`): `data` is the current
 * event (`GET /events/{id}`), `null` once deleted.
 */
const eventChanged: TriggerDefinition<Params, TriggerPayload, SubscriptionState> = {
  key: "event-changed",
  title: "Event Changed",
  description: "Fires when a Cohost event is created, updated, deleted or published.",
  params: [
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for created, updated and deleted.",
      default: [...DEFAULT_ACTIONS],
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" },
        { value: "published", label: "Published" },
      ],
    },
  ],
  output: EVENT_CHANGED_OUTPUT,
  sample: EVENT_CHANGED_SAMPLE,

  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS, DEFAULT_ACTIONS).map((a) => `event.${a}`);
    return subscribeWebhook(ctx, "w6w: event changed", callbackUrl, events);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  },
};

export default eventChanged;
