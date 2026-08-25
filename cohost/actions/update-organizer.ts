import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { organizerOutput } from "../lib/params.ts";
import type { Organizer } from "../lib/types.ts";

interface Input {
  organizer: string;
  /** Organizer fields. Wrapped as `{ organizer }` on the wire. `name` is required by the API. */
  patch: Record<string, unknown>;
}

/** PATCH /organizers/{organizer} — update an organizer. */
const updateOrganizer: ActionDefinition<Input> = {
  key: "update-organizer",
  type: "perform",
  resource: "organizer",
  title: "Update Organizer",
  description: "Update a Cohost organizer.",
  idempotent: true,
  params: [
    { key: "organizer", label: "Organizer ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'Organizer fields — the API requires `name`. id/companyId are ignored.',
    },
  ],
  output: organizerOutput,

  async execute(input, ctx) {
    ctx.log("info", "updating organizer", { organizer: input.organizer });
    const client = new CohostClient(ctx);
    const { organizer } = await client.request<{ organizer: Organizer }>(
      `/organizers/${encodeURIComponent(input.organizer)}`,
      { method: "PATCH", body: { organizer: input.patch } },
    );
    return organizer;
  },
};

export default updateOrganizer;
