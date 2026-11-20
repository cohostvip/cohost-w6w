/** The kinds of sales channel Cohost knows. */
export const CHANNEL_TYPES = ["website", "social", "promoter", "affiliate", "api", "seller", "other"] as const;

export const CHANNEL_TYPE_OPTIONS = CHANNEL_TYPES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

/** `/company/sales-channels/{channelId}` — every channel route hangs off it. */
export const channelPath = (channelId: string, ...rest: string[]): string =>
  ["/company/sales-channels", channelId, ...rest].map((part, i) => (i === 0 ? part : encodeURIComponent(part.trim())))
    .join("/");

/** The channel's default price modifier params, shared by create-channel and update-channel. */
export const DEFAULT_PRICING_PARAMS = [
  {
    key: "pricingFormulaId",
    label: "Default price formula ID",
    type: "string" as const,
    hint: "Optional. Prices your own events' listings on the channel that set no formula or markup of their own. Replaces the default markup.",
  },
  {
    key: "pricingMarkupPercent",
    label: "Default markup %",
    type: "number" as const,
    hint: "Optional. Used when no default price formula is given; 0 means no default.",
  },
];

/**
 * The channel's `pricing` from the default-pricing params: the formula alone, else the markup, else
 * nothing (`undefined` = leave it as is). A markup of 0 clears the default.
 */
export const defaultPricingOf = (input: {
  pricingFormulaId?: string;
  pricingMarkupPercent?: number | string;
}): { formulaId: string } | { markupPercent: number } | null | undefined => {
  const formulaId = input.pricingFormulaId?.trim();
  if (formulaId) return { formulaId };
  if (input.pricingMarkupPercent === undefined || input.pricingMarkupPercent === "") return undefined;
  const markupPercent = Number(input.pricingMarkupPercent);
  if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000) {
    throw new Error("Default markup % must be a number from 0 to 1000");
  }
  return markupPercent === 0 ? null : { markupPercent };
};
