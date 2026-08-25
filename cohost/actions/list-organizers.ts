import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import type { Organizer } from "../lib/types.ts";

type Input = Record<string, never>;

/**
 * GET /organizers — organizers belonging to the authenticated company.
 *
 * The API wraps this one as `{ organizers }`; it is re-keyed to `{ results }` so
 * every list action in this app looks the same. Returns `[]` when the token has
 * no company.
 */
const listOrganizers: ActionDefinition<Input> = {
  key: "list-organizers",
  type: "read",
  resource: "organizer",
  title: "List Organizers",
  description: "List the Cohost organizers of the authenticated company.",
  params: [],
  output: [{ key: "results", type: "array", label: "Organizers" }],

  async execute(_input, ctx) {
    ctx.log("info", "listing organizers");
    const client = new CohostClient(ctx);
    const { organizers } = await client.request<{ organizers: Organizer[] }>("/organizers");
    return { results: organizers };
  },
};

export default listOrganizers;
