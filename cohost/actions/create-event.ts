import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { contextParam } from "../lib/params.ts";

interface Input {
  /** Event fields. Wrapped as `{ event }` on the wire. */
  event: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/**
 * POST /events — create an event.
 *
 * Returns only the new id; follow with `get-event` for the full profile.
 * Not idempotent: a retry creates a second event.
 */
const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a Cohost event.",
  idempotent: false,
  params: [
    {
      key: "event",
      label: "Event",
      type: "json",
      required: true,
      hint: 'Event fields, e.g. { "name": "Summer Concert", "start": "2026-07-15T19:00:00Z" }.',
    },
    contextParam,
  ],
  output: [{ key: "id", type: "string", label: "Event ID" }],

  async execute(input, ctx) {
    ctx.log("info", "creating event");
    const client = new CohostClient(ctx);
    return client.request("/events", {
      method: "POST",
      body: { event: input.event, context: input.context },
    });
  },
};

export default createEvent;
