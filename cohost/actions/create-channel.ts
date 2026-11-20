import type { ActionDefinition } from "@w6w/types";
import { CHANNEL_TYPE_OPTIONS, DEFAULT_PRICING_PARAMS, defaultPricingOf } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { CHANNEL_OUTPUT } from "../lib/outputs.ts";

interface Input {
  name: string;
  type: string;
  description?: string;
  isPublic?: boolean;
  pricingFormulaId?: string;
  pricingMarkupPercent?: number;
  /** Any other channel fields, merged under the named ones. */
  fields?: Record<string, unknown>;
}

/**
 * POST /company/sales-channels — create a sales channel for your company. Needs an admin,
 * editor or owner role in the company.
 */
const createChannel: ActionDefinition<Input> = {
  key: "create-channel",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a sales channel for your company.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "type", label: "Type", type: "select", required: true, default: "website", options: CHANNEL_TYPE_OPTIONS },
    { key: "description", label: "Description", type: "text" },
    {
      key: "isPublic",
      label: "Public in the marketplace",
      type: "boolean",
      default: false,
      hint: "Other organizers can find the channel and apply to list their events on it. Needs the channel's marketplace branding first: a logo and a brand color (fields: logo, brandColor).",
    },
    ...DEFAULT_PRICING_PARAMS,
    {
      key: "fields",
      label: "Other fields",
      type: "json",
      hint: 'Optional. Any other channel fields, e.g. { "tags": ["nightlife"], "listingOptions": { "allowFees": true } }.',
    },
  ],
  output: CHANNEL_OUTPUT,

  async execute(input, ctx) {
    const extra = input.fields && typeof input.fields === "object" && !Array.isArray(input.fields) ? input.fields : {};
    const channel: Record<string, unknown> = { ...extra, name: input.name.trim(), type: input.type };
    if (input.description?.trim()) channel.description = input.description.trim();
    if (input.isPublic !== undefined) channel.isPublic = input.isPublic;
    const pricing = defaultPricingOf(input);
    if (pricing) channel.pricing = pricing;
    ctx.log("info", "creating channel", { name: channel.name, type: channel.type });
    return new CohostClient(ctx).request("/company/sales-channels", { method: "POST", body: { channel } });
  },
};

export default createChannel;
