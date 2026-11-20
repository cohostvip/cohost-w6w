import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import {
  CAP_TYPE_OPTIONS,
  type CapType,
  FORMULA_CURRENCY_OPTIONS,
  type FormulaBody,
  formulaPath,
  PRICE_FORMULA_OUTPUT,
  toAmount,
  toCap,
} from "../lib/price-formulas.ts";

interface Input {
  name: string;
  currency: string;
  markupPercent?: number;
  amount?: number;
  capType?: CapType;
  cap?: number;
  description?: string;
}

/**
 * POST /company/price-formulas — save a price formula: a markup percent, then a flat amount
 * added, optionally capped (e.g. "Eventbrite VIP: 25% + $10, at most $100", or "10% + $10, at
 * most 20% of the price"). Assign it to tickets with Assign Price Formula. Needs
 * an admin, editor or owner role in the company.
 */
const createPriceFormula: ActionDefinition<Input> = {
  key: "create-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Create Price Formula",
  description: "Save a named pricing rule (markup %, plus an amount, optionally capped) to assign to tickets on channels.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "e.g. Eventbrite VIP" },
    {
      key: "currency",
      label: "Amount currency",
      type: "select",
      required: true,
      default: "USD",
      options: FORMULA_CURRENCY_OPTIONS,
      hint: "The amount is only added to tickets priced in this currency.",
    },
    {
      key: "markupPercent",
      label: "Markup %",
      type: "number",
      validation: { min: 0, max: 1000 },
      hint: "Raises the ticket price by this percent, e.g. 15.",
    },
    {
      key: "amount",
      label: "Amount added",
      type: "number",
      validation: { min: 0 },
      hint: "Added after the markup, in major units, e.g. 10 for $10.00.",
    },
    {
      key: "capType",
      label: "Cap",
      type: "select",
      default: "none",
      options: CAP_TYPE_OPTIONS,
      hint: "Limits what the markup and amount together add to a ticket.",
    },
    {
      key: "cap",
      label: "Cap value",
      type: "number",
      validation: { min: 0 },
      hint: "For an amount cap, major units in the amount currency (100 for $100.00); for a percent cap, the percent (20).",
    },
    { key: "description", label: "Description", type: "text" },
  ],
  output: PRICE_FORMULA_OUTPUT,

  async execute(input, ctx) {
    const body: FormulaBody = { name: input.name.trim(), markupPercent: Number(input.markupPercent ?? 0) };
    const amount = toAmount(input.amount, input.currency);
    if (amount) body.amount = amount;
    Object.assign(body, toCap(input.capType ?? "none", input.cap, input.currency));
    if (input.description?.trim()) body.description = input.description.trim();
    ctx.log("info", "creating price formula", { name: body.name });
    return new CohostClient(ctx).request(formulaPath(), { method: "POST", body });
  },
};

export default createPriceFormula;
