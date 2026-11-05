import {
  type ChangeNotification,
  pickValues,
  type SubscriptionState,
  subscribeWebhook,
  toNotification,
  unsubscribeWebhook,
} from "../lib/notification.ts";
import { OBJECT_CHANGED_OUTPUT, OBJECT_CHANGED_SAMPLE } from "../lib/outputs.ts";
import type { TriggerDefinition } from "../lib/w6w-triggers.ts";

/**
 * Every object × action Cohost emits a webhook event for. `*.changed` is left
 * out: Cohost fires it alongside every `*.updated`, so it would double-deliver.
 */
const EVENTS: Record<string, readonly string[]> = {
  event: ["created", "updated", "deleted", "published"],
  offering: ["created", "updated", "deleted"],
  order: ["created", "updated", "placed", "refunded"],
  attendee: ["created", "deleted", "checked_in"],
};
const TYPES = Object.keys(EVENTS);
const ACTIONS = [...new Set(Object.values(EVENTS).flat())];
const DEFAULT_ACTIONS = ["created", "updated", "deleted"] as const;

interface Params {
  types?: string[];
  actions?: string[];
}

/** The webhook events for the picked `types` × `actions` that Cohost actually emits. */
export function webhookEvents(params: Params): string[] {
  const types = pickValues("types", params.types, TYPES, TYPES);
  const actions = pickValues("actions", params.actions, ACTIONS, DEFAULT_ACTIONS);
  const events = types.flatMap((t) => actions.filter((a) => EVENTS[t].includes(a)).map((a) => `${t}.${a}`));
  if (events.length === 0) {
    throw new TypeError(`Cohost emits none of ${actions.join(", ")} for ${types.join(", ")}.`);
  }
  return events;
}

/**
 * Object Changed — the general trigger: fires when any picked Cohost object
 * type changes, and hands the workflow only what changed — its URN, the
 * action (`created`, `updated`, `deleted`, …) and its type (`event`,
 * `offering`, `order`, `attendee`). It does not fetch the object; follow it
 * with the matching `get-*` action when the workflow needs the data.
 *
 * Cohost webhooks take no wildcard, so `onSubscribe` registers one webhook for
 * the explicit list of events the picked types × actions map to.
 */
const objectChanged: TriggerDefinition<Params, ChangeNotification, SubscriptionState> = {
  key: "object-changed",
  title: "Object Changed",
  description: "Fires when a Cohost event, ticket, order or attendee changes. Sends its URN, action and type.",
  params: [
    {
      key: "types",
      label: "Types",
      type: "multiselect",
      hint: "Leave empty for all.",
      default: [...TYPES],
      options: [
        { value: "event", label: "Event" },
        { value: "offering", label: "Ticket (offering)" },
        { value: "order", label: "Order" },
        { value: "attendee", label: "Attendee" },
      ],
    },
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
        { value: "published", label: "Published (events)" },
        { value: "placed", label: "Placed (orders)" },
        { value: "refunded", label: "Refunded (orders)" },
        { value: "checked_in", label: "Checked in (attendees)" },
      ],
    },
  ],
  output: OBJECT_CHANGED_OUTPUT,
  sample: OBJECT_CHANGED_SAMPLE,

  async onSubscribe({ params, callbackUrl }, ctx) {
    return subscribeWebhook(ctx, "w6w: object changed", callbackUrl, webhookEvents(params));
  },

  onUnsubscribe({ state }, ctx) {
    return unsubscribeWebhook(ctx, state);
  },

  handleIngest({ raw }) {
    return [toNotification(raw)];
  },
};

export default objectChanged;
