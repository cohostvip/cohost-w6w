import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  user: string;
  /** Selects which channel profile to read. Sent as `x-cohost-channel-id`. */
  channelId: string;
}

/**
 * GET /users/{user} — a user's channel profile.
 *
 * The channel is selected by the `x-cohost-channel-id` header, not the path.
 * Public profiles are readable by anyone; private and unlisted ones only by
 * their owner.
 */
const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User Profile",
  description: "Fetch a Cohost user's channel profile.",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: 'Which channel profile to read, e.g. "groov" or "cohost".',
    },
  ],
  output: [
    { key: "uid", type: "string", label: "User ID" },
    { key: "id", type: "string", label: "Profile ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "displayName", type: "string", label: "Display Name" },
    { key: "bio", type: "string", label: "Bio" },
    { key: "photoURL", type: "string", label: "Photo URL" },
    { key: "website", type: "string", label: "Website" },
    { key: "location", type: "string", label: "Location" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "socialLinks", type: "object", label: "Social Links" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "fetching user profile", { user: input.user, channelId: input.channelId });
    const client = new CohostClient(ctx);
    return client.request(`/users/${encodeURIComponent(input.user)}`, {
      headers: { "x-cohost-channel-id": input.channelId },
    });
  },
};

export default getUser;
