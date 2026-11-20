import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { formulaPath, PRICE_FORMULA_DETAIL_OUTPUT } from "../lib/price-formulas.ts";

interface Input {
  formulaId: string;
}

/**
 * GET /company/price-formulas/{formulaId} — one of your price formulas, with every channel
 * listing it is assigned on (the event, the channel, the listing, and the tickets it prices).
 */
const getPriceFormula: ActionDefinition<Input> = {
  key: "get-price-formula",
  type: "read",
  resource: "price-formula",
  title: "Get Price Formula",
  description: "Get a price formula and every channel listing and ticket it prices.",
  params: [{ key: "formulaId", label: "Formula ID", type: "string", required: true }],
  output: PRICE_FORMULA_DETAIL_OUTPUT,

  async execute(input, ctx) {
    ctx.log("info", "getting price formula", { formulaId: input.formulaId });
    return new CohostClient(ctx).request(formulaPath(input.formulaId));
  },
};

export default getPriceFormula;
