import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  organizer: string;
}

/** DELETE /organizers/{organizer} — delete an organizer. Returns `null`. */
const deleteOrganizer: ActionDefinition<Input> = {
  key: "delete-organizer",
  type: "perform",
  resource: "organizer",
  title: "Delete Organizer",
  description: "Delete a Cohost organizer.",
  idempotent: true,
  params: [
    { key: "organizer", label: "Organizer ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Organizer ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting organizer", { organizer: input.organizer });
    const client = new CohostClient(ctx);
    await client.request(`/organizers/${encodeURIComponent(input.organizer)}`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.organizer };
  },
};

export default deleteOrganizer;
