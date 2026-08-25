import type { ActionDefinition } from "@w6w/types";
import { cohostEventToEventbrite } from "../lib/events.ts";
import type { CohostEvent } from "../lib/types.ts";

interface Input {
  /** A Cohost Event object. */
  event: CohostEvent;
}

/**
 * Transform a Cohost Event into an Eventbrite Event.
 *
 * Pure shape conversion — no auth, no network. The output matches the body
 * Eventbrite's `POST /events` expects (nested under `event`).
 */
const cohostEventToEventbriteAction: ActionDefinition<Input> = {
  key: "cohost-event-to-eventbrite",
  type: "perform",
  resource: "event",
  title: "Cohost → Eventbrite: Event",
  description: "Convert a Cohost event into an Eventbrite event object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "event", label: "Cohost Event (JSON)", type: "json", required: true },
  ],
  output: [
    { key: "name", type: "object", label: "Name ({ text, html })" },
    { key: "description", type: "object", label: "Description ({ text, html })" },
    { key: "start", type: "object", label: "Start ({ timezone, utc })" },
    { key: "end", type: "object", label: "End ({ timezone, utc })" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "capacity", type: "number", label: "Capacity" },
    { key: "logo", type: "object", label: "Logo" },
  ],

  execute(input) {
    return cohostEventToEventbrite(input.event);
  },
};

export default cohostEventToEventbriteAction;
