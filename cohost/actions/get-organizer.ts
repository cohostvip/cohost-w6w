import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { organizerOutput } from "../lib/params.ts";
import type { Organizer } from "../lib/types.ts";

interface Input {
  organizer: string;
}

/**
 * GET /organizers/{organizer} — fetch one organizer.
 *
 * The API wraps the body as `{ organizer }`; the action unwraps it, matching
 * `@cohostvip/cohost-node`.
 */
const getOrganizer: ActionDefinition<Input> = {
  key: "get-organizer",
  type: "read",
  resource: "organizer",
  title: "Get Organizer",
  description: "Fetch a Cohost organizer by id.",
  params: [
    { key: "organizer", label: "Organizer ID", type: "string", required: true },
  ],
  output: organizerOutput,

  async execute(input, ctx) {
    ctx.log("info", "fetching organizer", { organizer: input.organizer });
    const client = new CohostClient(ctx);
    const { organizer } = await client.request<{ organizer: Organizer }>(
      `/organizers/${encodeURIComponent(input.organizer)}`,
    );
    return organizer;
  },
};

export default getOrganizer;
