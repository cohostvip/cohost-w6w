import type { ActionDefinition } from "@w6w/types";
import { channelPath, DEFAULT_PRICING_PARAMS, defaultPricingOf } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { CHANNEL_OUTPUT } from "../lib/outputs.ts";

interface Input {
  channelId: string;
  name?: string;
  description?: string;
  status?: string;
  isPublic?: boolean;
  pricingFormulaId?: string;
  pricingMarkupPercent?: number;
  /** Drop the channel's default price modifier. */
  clearPricing?: boolean;
  /** Any other channel fields; the named ones win. */
  changes?: Record<string, unknown>;
}

/**
 * PUT /company/sales-channels/{channelId} — change one of your sales channels. Only the fields
 * given change. Needs an admin, editor or owner role in the company.
 */
const updateChannel: ActionDefinition<Input> = {
  key: "update-channel",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  description: "Change one of your sales channels; only the fields you fill in change.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      key: "isPublic",
      label: "Public in the marketplace",
      type: "boolean",
      hint: "Making it public (or asking to) needs the channel's marketplace branding first: a logo and a brand color.",
    },
    ...DEFAULT_PRICING_PARAMS,
    {
      key: "clearPricing",
      label: "Clear the default pricing",
      type: "boolean",
      hint: "Drop the channel's default price formula or markup: its listings price at the event's own prices again.",
    },
    {
      key: "changes",
      label: "Other changes",
      type: "json",
      hint: 'Optional. Any other channel fields, e.g. { "tags": ["nightlife"], "listingOptions": { "allowFees": true } }.',
    },
  ],
  output: CHANNEL_OUTPUT,

  async execute(input, ctx) {
    const extra = input.changes && typeof input.changes === "object" && !Array.isArray(input.changes) ? input.changes : {};
    const channel: Record<string, unknown> = { ...extra };
    if (input.name?.trim()) channel.name = input.name.trim();
    if (input.description !== undefined && input.description !== "") channel.description = input.description;
    if (input.status) channel.status = input.status;
    if (input.isPublic !== undefined) channel.isPublic = input.isPublic;
    const pricing = input.clearPricing ? null : defaultPricingOf(input);
    if (pricing !== undefined) channel.pricing = pricing;
    if (Object.keys(channel).length === 0) throw new Error("Nothing to change: fill in at least one field");
    ctx.log("info", "updating channel", { channelId: input.channelId, fields: Object.keys(channel) });
    return new CohostClient(ctx).request(channelPath(input.channelId), { method: "PUT", body: { channel } });
  },
};

export default updateChannel;
