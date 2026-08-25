import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { contextParam } from "../lib/params.ts";

interface Input {
  event: string;
  /** Partial event fields. Wrapped as `{ event }` on the wire. */
  patch: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/** PATCH /events/{event} — partial update of an event. */
const updateEvent: ActionDefinition<Input> = {
  key: "update-event",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Partially update a Cohost event.",
  idempotent: true,
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Partial event fields, e.g. { "capacity": 5000 }.',
    },
    contextParam,
  ],
  output: [{ key: "id", type: "string", label: "Event ID" }],

  async execute(input, ctx) {
    ctx.log("info", "updating event", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}`, {
      method: "PATCH",
      body: { event: input.patch, context: input.context },
    });
  },
};

export default updateEvent;
