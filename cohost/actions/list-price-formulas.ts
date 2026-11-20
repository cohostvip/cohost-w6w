import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { formulaPath, PRICE_FORMULA_OUTPUT } from "../lib/price-formulas.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

const OUTPUT: OutputField[] = [{ key: "results", type: "array", label: "Price formulas", items: PRICE_FORMULA_OUTPUT }];

/**
 * GET /company/price-formulas — your company's price formulas (Pricing → Formulas), by name, each
 * with how widely it is used. A formula is a markup percent, then a flat amount added, assigned to
 * tickets on channel listings; changing it reprices every ticket it is assigned to.
 */
const listPriceFormulas: ActionDefinition<Record<string, never>> = {
  key: "list-price-formulas",
  type: "read",
  resource: "price-formula",
  title: "List Price Formulas",
  description: "List your company's price formulas, with how many events, listings and tickets use each.",
  params: [],
  output: OUTPUT,

  async execute(_input, ctx) {
    ctx.log("info", "listing price formulas");
    const results = await new CohostClient(ctx).request<unknown[]>(formulaPath());
    return { results: results ?? [] };
  },
};

export default listPriceFormulas;
