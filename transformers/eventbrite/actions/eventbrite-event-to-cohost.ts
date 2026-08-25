import type { ActionDefinition } from "@w6w/types";
import { eventbriteEventToCohost } from "../lib/events.ts";
import type { EbEvent } from "../lib/types.ts";

interface Input {
  /** An Eventbrite Event object (v3 API shape). */
  event: EbEvent;
}

/**
 * Transform an Eventbrite Event into a Cohost Event.
 *
 * Pure shape conversion — no auth, no network. Feed it an Eventbrite event
 * (e.g. from `GET /events/{id}`), pass the result to a Cohost create/import step.
 */
const eventbriteEventToCohostAction: ActionDefinition<Input> = {
  key: "eventbrite-event-to-cohost",
  type: "perform",
  resource: "event",
  title: "Eventbrite → Cohost: Event",
  description: "Convert an Eventbrite event into a Cohost event object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "event", label: "Eventbrite Event (JSON)", type: "json", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "tz", type: "string", label: "Timezone" },
    { key: "start", type: "string", label: "Start (ISO)" },
    { key: "end", type: "string", label: "End (ISO)" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "flyer", type: "object", label: "Flyer" },
    { key: "source", type: "string", label: "Source" },
    { key: "sourceId", type: "string", label: "Source ID" },
  ],

  execute(input) {
    return eventbriteEventToCohost(input.event);
  },
};

export default eventbriteEventToCohostAction;
