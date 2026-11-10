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
  q: string;
}

/** `/search` clamps `limit` to this; mirror it so `pagination.size` reports what was served. */
const MAX_SIZE = 100;
const DEFAULT_SIZE = 20;

/** One hit from the `/search` index, as the API returns it. */
interface SearchHit {
  entityId: string;
  [key: string]: unknown;
}

interface SearchResponse {
  results: SearchHit[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * GET /search?types=event — full-text event search over the company's search index.
 *
 * The index speaks `limit` / `offset`; this action takes the same `page` / `size` as every
 * other list action and maps them, so paging works identically everywhere. Each hit's `id`
 * is the event id (the index row id is dropped) so it feeds straight into `get-event`.
 */
const searchEvents: ActionDefinition<Input> = {
  key: "search-events",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search Cohost events by text, paginated.",
  params: [
    { key: "q", label: "Query", type: "string", required: true, hint: "Free-text search term." },
    ...paginationParams,
  ],
  output: paginatedOutput("Events"),

  async execute(input, ctx) {
    ctx.log("info", "searching events", { q: input.q });
    const { page = 1, size = DEFAULT_SIZE } = paginationQuery(input);
    const limit = Math.min(size, MAX_SIZE);
    const client = new CohostClient(ctx);
    const res = await client.request<SearchResponse>("/search", {
      query: { q: input.q, types: "event", limit, offset: (page - 1) * limit },
    });
    return {
      results: res.results.map(({ entityId, id: _indexRowId, ...hit }) => ({ ...hit, id: entityId })),
      pagination: { page, size: limit, total: res.total },
    };
  },
};

export default searchEvents;
