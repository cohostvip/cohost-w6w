import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import {
  CAP_TYPE_OPTIONS,
  type CapType,
  FORMULA_CURRENCY_OPTIONS,
  type FormulaBody,
  formulaPath,
  PRICE_FORMULA_DETAIL_OUTPUT,
  toAmount,
  toCap,
} from "../lib/price-formulas.ts";

interface Input {
  formulaId: string;
  name?: string;
  markupPercent?: number;
  amount?: number;
  currency?: string;
  capType?: CapType;
  cap?: number;
  description?: string;
}

interface Formula {
  name: string;
  markupPercent?: number;
  amount?: string;
  capAmount?: string;
  capPercent?: number;
  description?: string;
}

const given = (value: unknown): boolean => value !== undefined && value !== null && value !== "";

/** The cap to save: the current one unless the input changes it (the type, the value, or both). */
const nextCap = (input: Input, current: Formula, currency: string): Pick<FormulaBody, "capAmount" | "capPercent"> => {
  const currentType: CapType = current.capPercent ? "percent" : current.capAmount ? "amount" : "none";
  const type = (given(input.capType) ? input.capType : currentType) as CapType;
  if (type === "none") {
    if (given(input.cap) && !given(input.capType)) throw new Error('Choose a cap type to set a cap value: "amount" or "percent"');
    return {};
  }
  if (given(input.cap)) return toCap(type, input.cap, currency);
  if (type !== currentType) throw new Error(`Cap value is required to switch the cap to "${type}"`);
  if (type === "percent") return { capPercent: current.capPercent };
  const minor = (current.capAmount ?? "").split(",")[1];
  return { capAmount: `${currency},${minor}` };
};

/**
 * PUT /company/price-formulas/{formulaId} — change a price formula; fields left blank keep their
 * value. A changed markup or amount reprices every ticket the formula is assigned to at once, and
 * fires Channel Event Changed (`customization`) for each of those listings. Needs an admin, editor
 * or owner role in the company.
 */
const updatePriceFormula: ActionDefinition<Input> = {
  key: "update-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Update Price Formula",
  description: "Change a price formula (markup, amount, cap) — every ticket it is assigned to is repriced at once.",
  idempotent: true,
  params: [
    { key: "formulaId", label: "Formula ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", hint: "Blank keeps the name." },
    {
      key: "markupPercent",
      label: "Markup %",
      type: "number",
      validation: { min: 0, max: 1000 },
      hint: "Blank keeps the markup; 0 removes it.",
    },
    {
      key: "amount",
      label: "Amount added",
      type: "number",
      validation: { min: 0 },
      hint: "Major units, e.g. 10 for $10.00. Blank keeps the amount; 0 removes it.",
    },
    {
      key: "currency",
      label: "Amount currency",
      type: "select",
      options: FORMULA_CURRENCY_OPTIONS,
      hint: "Blank keeps the amount's currency (USD for a new amount).",
    },
    {
      key: "capType",
      label: "Cap",
      type: "select",
      options: CAP_TYPE_OPTIONS,
      hint: "Blank keeps the cap; No cap removes it.",
    },
    {
      key: "cap",
      label: "Cap value",
      type: "number",
      validation: { min: 0 },
      hint: "Amount cap: major units (100 for $100.00); percent cap: the percent (20). Blank keeps the value.",
    },
    { key: "description", label: "Description", type: "text", hint: "Blank keeps the description." },
  ],
  output: PRICE_FORMULA_DETAIL_OUTPUT,

  async execute(input, ctx) {
    const client = new CohostClient(ctx);
    const current = await client.request<Formula>(formulaPath(input.formulaId));
    const [currentCurrency, currentMinor] = (current.amount ?? "").split(",");

    const body: FormulaBody = {
      name: input.name?.trim() || current.name,
      markupPercent: input.markupPercent ?? current.markupPercent ?? 0,
    };
    const currency = input.currency?.trim() || currentCurrency || current.capAmount?.split(",")[0] || "USD";
    const amount = input.amount !== undefined && input.amount !== null
      ? toAmount(input.amount, currency)
      : currentMinor
      ? `${currency},${currentMinor}`
      : undefined;
    if (amount) body.amount = amount;
    Object.assign(body, nextCap(input, current, currency));
    const description = input.description?.trim() || current.description;
    if (description) body.description = description;

    ctx.log("info", "updating price formula", { formulaId: input.formulaId });
    return client.request(formulaPath(input.formulaId), { method: "PUT", body });
  },
};

export default updatePriceFormula;
