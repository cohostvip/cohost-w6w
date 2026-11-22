import type { Option, Param } from "@w6w/types";
import { CohostClient } from "./client.ts";
import type { ResolveFieldsHook, ResolveFieldsOutput } from "./w6w-fields.ts";

/** The kinds of sales channel Cohost knows. */
export const CHANNEL_TYPES = ["website", "social", "promoter", "affiliate", "api", "seller", "other"] as const;

export const CHANNEL_TYPE_OPTIONS = CHANNEL_TYPES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

/** The most options the host accepts for one dynamic field. */
const MAX_CHANNEL_OPTIONS = 1000;

/**
 * The sales-channel param every channel form shares: a picker of your company's channels, filled
 * by {@link resolveChannelFields} (set it as the form's `resolveFields`). `allowCustom` keeps a
 * typed id or an expression legal — a channel created after the form opened, or one bound from an
 * earlier step.
 */
export const channelIdParam = (extra: Partial<Param> = {}): Param => ({
  key: "channelId",
  label: "Channel",
  type: "string",
  options: { source: "resolveFields" },
  config: { allowCustom: true },
  ...extra,
});

/** Your sales channels as picker options: active ones first, then by name; the id goes in the description. */
export const channelOptions = (channels: unknown): Option[] => {
  const rows = Array.isArray(channels)
    ? channels
    : Array.isArray((channels as { results?: unknown } | null)?.results)
    ? (channels as { results: unknown[] }).results
    : [];
  return rows
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null && typeof c.id === "string")
    .map((c) => {
      const id = c.id as string;
      const name = typeof c.name === "string" && c.name.trim() ? c.name.trim() : id;
      const inactive = c.status === "inactive";
      const detail = [typeof c.type === "string" ? c.type : "", inactive ? "inactive" : "", id].filter(Boolean);
      return { option: { value: id, label: name, description: detail.join(" · ") }, inactive };
    })
    .sort((a, b) => Number(a.inactive) - Number(b.inactive) || a.option.label.localeCompare(b.option.label))
    .slice(0, MAX_CHANNEL_OPTIONS)
    .map(({ option }) => option);
};

/**
 * `resolveFields` for a form with a {@link channelIdParam}: GET /company/sales-channels, as options.
 * A failed request is the field's error, never the form's.
 */
export const resolveChannelFields: ResolveFieldsHook = async (input, ctx): Promise<ResolveFieldsOutput> => {
  if (!input.fields.includes("channelId")) return { fields: {} };
  try {
    const channels = await new CohostClient(ctx).request<unknown>("/company/sales-channels");
    return { fields: { channelId: { options: channelOptions(channels) } } };
  } catch (error) {
    return { fields: { channelId: { error: error instanceof Error ? error.message : String(error) } } };
  }
};

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
