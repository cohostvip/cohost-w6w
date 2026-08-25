import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import {
  paginatedOutput,
  paginationParams,
  paginationQuery,
  type PaginationInput,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  event: string;
  filters?: Record<string, string | number | boolean>;
}

/**
 * GET /events/{event}/attendees — paginated attendee list.
 *
 * Not a public endpoint: requires an authenticated token with access to the event.
 */
const listEventAttendees: ActionDefinition<Input> = {
  key: "list-event-attendees",
  type: "read",
  resource: "attendee",
  title: "List Event Attendees",
  description: "List attendees on a Cohost event, paginated. Requires authentication.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    ...paginationParams,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: "Optional key/value object appended to the query string.",
    },
  ],
  output: paginatedOutput("Attendees"),

  async execute(input, ctx) {
    ctx.log("info", "listing event attendees", { event: input.event });
    const client = new CohostClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.event)}/attendees`, {
      query: { ...input.filters, ...paginationQuery(input) },
    });
  },
};

export default listEventAttendees;
