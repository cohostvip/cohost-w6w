import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { resourceId } from "../lib/resource-id.ts";
import { ATTENDEE_OUTPUT } from "../lib/outputs.ts";

interface Input {
  /** Event id or URN — converted to an ID before calling the API. */
  event: string;
  /** Attendee id or URN. */
  attendee: string;
}

/** GET /events/{event}/attendees/{attendee} — fetch a single attendee. Requires authentication. */
const getEventAttendee: ActionDefinition<Input> = {
  key: "get-event-attendee",
  type: "read",
  resource: "attendee",
  title: "Get Event Attendee",
  description: "Fetch one attendee on a Cohost event by id or URN.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "attendee", label: "Attendee (ID or URN)", type: "string", required: true },
  ],
  output: ATTENDEE_OUTPUT,

  async execute(input, ctx) {
    ctx.log("info", "fetching event attendee", { event: input.event, attendee: input.attendee });
    const client = new CohostClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(resourceId(input.event, "events"))}/attendees/${encodeURIComponent(resourceId(input.attendee, "attendees"))}`,
    );
  },
};

export default getEventAttendee;
