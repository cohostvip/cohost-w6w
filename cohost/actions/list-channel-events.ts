import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, channelPath, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { CHANNEL_LISTED_EVENT_OUTPUT } from "../lib/outputs.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

interface Input {
  channelId: string;
  status?: string;
  activeAt?: string;
  orderBy?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

const OUTPUT: OutputField[] = [
  { key: "results", type: "array", label: "Events on the channel", items: CHANNEL_LISTED_EVENT_OUTPUT },
  { key: "total", type: "number", label: "Total events on the channel" },
];

/**
 * GET /company/sales-channels/{channelId}/events — the events listed on one of your channels,
 * one page at a time: each event's public profile plus its listing state on the channel
 * (visibility, tags, meta, priority). Hidden listings are included; removed ones are not. Other
 * organizers' events on a public channel come back as their public profile only.
 */
const listChannelEvents: ActionDefinition<Input> = {
  key: "list-channel-events",
  type: "read",
  resource: "channel",
  title: "List Channel Events",
  description: "List the events listed on one of your sales channels.",
  params: [
    channelIdParam({ required: true }),
    { key: "status", label: "Event status", type: "string", hint: "Optional, comma-separated, e.g. live,ended." },
    {
      key: "activeAt",
      label: "Runs on date",
      type: "string",
      hint: "Optional YYYY-MM-DD: only events running on that date, in their own timezone.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "start", label: "Start date" },
        { value: "priority", label: "Listing priority" },
      ],
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    { key: "limit", label: "Page size", type: "number", default: 20, hint: "1 to 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: OUTPUT,

  resolveFields: resolveChannelFields,

  async execute(input, ctx) {
    ctx.log("info", "listing channel events", { channelId: input.channelId });
    const page = await new CohostClient(ctx).request<{ items: unknown[]; total: number }>(
      channelPath(input.channelId, "events"),
      {
        query: {
          status: input.status?.replace(/\s+/g, ""),
          activeAt: input.activeAt?.trim(),
          orderBy: input.orderBy,
          order: input.order,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { results: page.items ?? [], total: page.total ?? 0 };
  },
};

export default listChannelEvents;
