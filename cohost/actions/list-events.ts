import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import {
  paginatedOutput,
  paginationParams,
  paginationQuery,
  type PaginationInput,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  /** Extra filter key/values forwarded verbatim as query params. */
  filters?: Record<string, string | number | boolean>;
}

/** GET /events — paginated list of events visible to the token. */
const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "List Cohost events, paginated.",
  params: [
    ...paginationParams,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: "Optional key/value object appended to the query string.",
    },
  ],
  output: paginatedOutput("Events"),

  async execute(input, ctx) {
    ctx.log("info", "listing events", { page: input.page, size: input.size });
    const client = new CohostClient(ctx);
    return client.request("/events", {
      query: { ...input.filters, ...paginationQuery(input) },
    });
  },
};

export default listEvents;
