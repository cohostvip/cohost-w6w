import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { eventOutput } from "../lib/params.ts";

interface Input {
  /** Event id or URN — passed straight through to the API. */
  event: string;
}

/** GET /events/{event} — fetch a single event profile. */
const getEvent: ActionDefinition<Input> = {
  key: "get-event",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a Cohost event by id or URN.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
  ],
  output: eventOutput,

  async execute(input, ctx) {
    ctx.log("info", "fetching event", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}`);
  },
};

export default getEvent;
