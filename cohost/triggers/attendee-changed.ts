import {
  pickValues,
  type SubscriptionState,
  subscribeWebhook,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { ATTENDEE_CHANGED_OUTPUT, ATTENDEE_CHANGED_SAMPLE } from "../lib/outputs.ts";
import { type TriggerPayload, toPayload } from "../lib/payload.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/** The `attendee.*` webhook events Cohost emits. Attendees have no `updated` event. */
const ACTIONS = ["created", "checked_in", "deleted"] as const;
const DEFAULT_ACTIONS = ["created"] as const;

interface Params {
  actions?: string[];
}

/**
 * Attendee Changed — fires when a Cohost attendee is created, checked in or deleted.
 *
 * A placed order creates one attendee per admission (a 3-ticket order → 3 attendees), so with
 * the default `created` action the workflow runs once per attendee — the hook for per-person
 * work (a ticket email to each guest, a CRM contact per attendee, …). Attendees imported or
 * added by hand fire it too.
 *
 * Sends the unified trigger payload (`lib/payload.ts`): `data` is the current attendee
 * (`GET /events/{eventId}/attendees/{id}`), `null` once deleted. `data.orderId` leads to the
 * order (`get-order`).
 */
const attendeeChanged: TriggerDefinition<Params, TriggerPayload, SubscriptionState> = {
  key: "attendee-changed",
  title: "Attendee Changed",
  description:
    "Fires when a Cohost attendee is created (one per ticket on a placed order), checked in or deleted.",
  params: [
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      hint: "Leave empty for Created only.",
      default: [...DEFAULT_ACTIONS],
      options: [
        { value: "created", label: "Created" },
        { value: "checked_in", label: "Checked in" },
        { value: "deleted", label: "Deleted" },
      ],
    },
  ],
  output: ATTENDEE_CHANGED_OUTPUT,
  sample: ATTENDEE_CHANGED_SAMPLE,

  async onSubscribe({ params, callbackUrl }, ctx) {
    const events = pickValues("actions", params.actions, ACTIONS, DEFAULT_ACTIONS).map((a) => `attendee.${a}`);
    return subscribeWebhook(ctx, "w6w: attendee changed", callbackUrl, events);
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  async handleIngest({ raw }, ctx) {
    return [await toPayload(raw, ctx)];
  },
};

export default attendeeChanged;
