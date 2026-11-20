import type { OutputField } from "./w6w-triggers.ts";

/** `/company/price-formulas[/{formulaId}]`. */
export const formulaPath = (formulaId?: string): string =>
  formulaId === undefined ? "/company/price-formulas" : `/company/price-formulas/${encodeURIComponent(formulaId.trim())}`;

/** Currencies a formula's flat amount may be in; it is added to tickets priced in that currency only. */
export const FORMULA_CURRENCY_OPTIONS = ["USD", "CAD", "EUR", "GBP", "AUD", "ILS"].map((value) => ({
  value,
  label: value,
}));

/** A major-unit amount (10.5) in `currency` as the API's `"USD,1050"`, or `undefined` for none (0 / blank). */
export const toAmount = (amount: number | undefined, currency: string | undefined): string | undefined => {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return undefined;
  const minor = Math.round(Number(amount) * 100);
  if (minor < 0) throw new Error("Amount cannot be negative");
  return minor > 0 ? `${(currency || "USD").trim().toUpperCase()},${minor}` : undefined;
};

/** The formula body the API saves: name, rule and description. */
export interface FormulaBody {
  name: string;
  markupPercent: number;
  amount?: string;
  capAmount?: string;
  capPercent?: number;
  description?: string;
}

/** How a formula caps its markup (the percent part plus the amount). */
export type CapType = "none" | "amount" | "percent";

export const CAP_TYPE_OPTIONS: Array<{ value: CapType; label: string }> = [
  { value: "none", label: "No cap" },
  { value: "amount", label: "At most an amount" },
  { value: "percent", label: "At most a percent of the price" },
];

/**
 * The cap as the API saves it: `{ capAmount: "USD,10000" }` for an amount (major units, in the
 * formula's currency), `{ capPercent: 20 }` for a percent, `{}` for none.
 */
export const toCap = (
  type: CapType,
  cap: number | undefined,
  currency: string,
): Pick<FormulaBody, "capAmount" | "capPercent"> => {
  if (type === "none") return {};
  const value = Number(cap);
  if (cap === undefined || cap === null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Cap must be a number above 0 when the cap type is "${type}"`);
  }
  if (type === "percent") return { capPercent: value };
  return { capAmount: `${(currency || "USD").trim().toUpperCase()},${Math.round(value * 100)}` };
};

export const PRICE_FORMULA_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Formula ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "markupPercent", type: "number", label: "Markup %" },
  { key: "amount", type: "string", label: "Amount added (CUR,minor)" },
  { key: "capAmount", type: "string", label: "Cap: the most it adds (CUR,minor)" },
  { key: "capPercent", type: "number", label: "Cap: the most it adds, % of the price" },
  { key: "usage.events", type: "number", label: "Used on: events" },
  { key: "usage.listings", type: "number", label: "Used on: channel listings" },
  { key: "usage.tickets", type: "number", label: "Used on: tickets assigned it" },
  { key: "usage.channels", type: "number", label: "Used on: channels' default pricing" },
  { key: "created", type: "string", label: "Created" },
  { key: "changed", type: "string", label: "Changed" },
];

const ASSIGNMENT_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "channelId", type: "string", label: "Channel ID" },
  { key: "listingId", type: "string", label: "Listing ID" },
  { key: "offeringIds", type: "array", label: "Ticket IDs assigned the formula" },
  { key: "listingWide", type: "boolean", label: "The listing's formula (prices its other tickets)" },
];

export const PRICE_FORMULA_DETAIL_OUTPUT: OutputField[] = [
  ...PRICE_FORMULA_OUTPUT,
  { key: "assignments", type: "array", label: "Where it is assigned", items: ASSIGNMENT_OUTPUT },
  {
    key: "channels",
    type: "array",
    label: "Channels whose default pricing it is",
    items: [
      { key: "channelId", type: "string", label: "Channel ID" },
      { key: "name", type: "string", label: "Channel name" },
    ],
  },
];
