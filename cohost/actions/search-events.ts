import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import {
  paginatedOutput,
  paginationParams,
  paginationQuery,
  type PaginationInput,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  /** Free-text query, forwarded as `?q=`. */
  q?: string;
  /** Extra filter key/values forwarded verbatim as query params. */
  filters?: Record<string, string | number | boolean>;
}

/** GET /events/search — paginated event search. */
const searchEvents: ActionDefinition<Input> = {
  key: "search-events",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search Cohost events, paginated.",
  params: [
    { key: "q", label: "Query", type: "string", hint: "Free-text search term." },
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
    ctx.log("info", "searching events", { q: input.q });
    const client = new CohostClient(ctx);
    return client.request("/events/search", {
      query: { q: input.q, ...input.filters, ...paginationQuery(input) },
    });
  },
};

export default searchEvents;
