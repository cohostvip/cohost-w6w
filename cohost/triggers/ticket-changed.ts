import { CohostClient } from "../lib/client.ts";
import {
  type ChangeNotification,
  pickValues,
  type SubscriptionState,
  subscribeWebhook,
  toNotification,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { TICKET_CHANGED_OUTPUT, TICKET_CHANGED_SAMPLE } from "../lib/outputs.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

const ACTIONS = ["created", "updated", "deleted"] as const;

interface Params {
  actions?: string[];
}

/**
 * Ticket Changed — fires when a ticket on a Cohost event is created, updated
 * or deleted. Tickets are offerings on the platform, so this subscribes to the
 * `offering.*` webhook events (`offering.changed` duplicates every
 * `offering.updated`, so it is not offered).
 *
 * `handleIngest` hands the workflow the change notification plus the current
 * ticket (`GET /events/{eventId}/tickets/{id}`); `ticket` is `null` for a
 * deleted one.
 */
const ticketChanged: TriggerDefinition<Params, ChangeNotification & { ticket: unknown }, SubscriptionState> = {
  key: "ticket-changed",
  title: "Ticket Changed",
  description: "Fires when a ticket on a Cohost event is created, updated or deleted.",
  params: [
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...ACTIONS],
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" },
      ],
    },
  ],
  output: TICKET_CHANGED_OUTPUT,
  sample: TICKET_CHANGED_SAMPLE,

  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS, ACTIONS).map((a) => `offering.${a}`);
    return subscribeWebhook(ctx, "w6w: ticket changed", callbackUrl, events);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw }, ctx) {
    const change = toNotification(raw);
    const ticket = change.action === "deleted" || !change.eventId
      ? null
      : await new CohostClient(ctx).request(
        `/events/${encodeURIComponent(change.eventId)}/tickets/${encodeURIComponent(change.id)}`,
      );
    return [{ ...change, ticket }];
  },
};

export default ticketChanged;
