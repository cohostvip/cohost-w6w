import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { formulaPath } from "../lib/price-formulas.ts";

interface Input {
  formulaId: string;
}

/**
 * DELETE /company/price-formulas/{formulaId} — delete a price formula. Refused (409) while any
 * channel listing still uses it, so no ticket silently falls back to another price: reassign those
 * tickets first (Assign Price Formula with another formula, or none). Needs an admin, editor or
 * owner role in the company.
 */
const deletePriceFormula: ActionDefinition<Input> = {
  key: "delete-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Delete Price Formula",
  description: "Delete a price formula no channel listing uses any more.",
  idempotent: true,
  params: [{ key: "formulaId", label: "Formula ID", type: "string", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Formula ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting price formula", { formulaId: input.formulaId });
    await new CohostClient(ctx).request(formulaPath(input.formulaId), { method: "DELETE" });
    return { deleted: true, id: input.formulaId.trim() };
  },
};

export default deletePriceFormula;
