import { CohostClient } from "../lib/client.ts";
import {
  type ChangeNotification,
  pickValues,
  type SubscriptionState,
  subscribeWebhook,
  toNotification,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { EVENT_CHANGED_OUTPUT, EVENT_CHANGED_SAMPLE } from "../lib/outputs.ts";
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
 * `handleIngest` hands the workflow the change notification plus the current
 * event (`GET /events/{id}`); a deleted event has nothing left to fetch, so
 * `event` is `null` then.
 */
const eventChanged: TriggerDefinition<Params, ChangeNotification & { event: unknown }, SubscriptionState> = {
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
    const change = toNotification(raw);
    const event = change.action === "deleted"
      ? null
      : await new CohostClient(ctx).request(`/events/${encodeURIComponent(change.id)}`);
    return [{ ...change, event }];
  },
};

export default eventChanged;
