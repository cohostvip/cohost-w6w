import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  limit?: number;
  offset?: number;
  verified?: boolean;
}

/**
 * GET /users — public channel profiles.
 *
 * Two things make this endpoint the odd one out (see `.claude/docs/SDK_ENDPOINTS.md`):
 * it paginates with `limit`/`offset` rather than the platform-standard
 * `page`/`size`, and it returns its own `{ total, limit, offset, hasMore }`
 * pagination shape. Private and unlisted profiles are excluded.
 */
const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List User Profiles",
  description: "List public Cohost channel profiles.",
  params: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: 'Which channel to list, e.g. "groov" or "cohost".',
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Default 20, max 100.",
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Default 0.",
      validation: { integer: true, min: 0 },
    },
    { key: "verified", label: "Verified Only", type: "boolean" },
  ],
  output: [
    { key: "results", type: "array", label: "Profiles" },
    { key: "pagination.total", type: "number", label: "Total" },
    { key: "pagination.limit", type: "number", label: "Limit" },
    { key: "pagination.offset", type: "number", label: "Offset" },
    { key: "pagination.hasMore", type: "boolean", label: "Has More" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "listing user profiles", { channelId: input.channelId });
    const client = new CohostClient(ctx);
    return client.request("/users", {
      query: { limit: input.limit, offset: input.offset, verified: input.verified },
      headers: { "x-cohost-channel-id": input.channelId },
    });
  },
};

export default listUsers;
