import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { organizerOutput } from "../lib/params.ts";
import type { Organizer } from "../lib/types.ts";

interface Input {
  name: string;
  /** Any other organizer fields (bio, headline, links, logo, …). */
  organizer?: Record<string, unknown>;
}

/**
 * POST /organizers — create an organizer for the authenticated company.
 *
 * Body and response are both wrapped as `{ organizer }`. `companyId` is forced
 * from the token and is not accepted in the body.
 */
const createOrganizer: ActionDefinition<Input> = {
  key: "create-organizer",
  type: "perform",
  resource: "organizer",
  title: "Create Organizer",
  description: "Create a Cohost organizer for the authenticated company.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "organizer",
      label: "Additional Fields",
      type: "json",
      hint: 'Optional extra fields, e.g. { "headline": "…", "bio": "…", "links": [ … ] }. companyId is ignored.',
    },
  ],
  output: organizerOutput,

  async execute(input, ctx) {
    ctx.log("info", "creating organizer", { name: input.name });
    const client = new CohostClient(ctx);
    const { organizer } = await client.request<{ organizer: Organizer }>("/organizers", {
      method: "POST",
      body: { organizer: { ...input.organizer, name: input.name } },
    });
    return organizer;
  },
};

export default createOrganizer;
