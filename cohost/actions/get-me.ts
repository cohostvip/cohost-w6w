import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** GET /me — the profile of the user behind the connected token. */
const getMe: ActionDefinition<Input> = {
  key: "get-me",
  type: "read",
  resource: "user",
  title: "Get My Profile",
  description: "Fetch the profile of the authenticated Cohost user.",
  params: [],
  output: [
    { key: "uid", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "first", type: "string", label: "First Name" },
    { key: "last", type: "string", label: "Last Name" },
    { key: "name", type: "string", label: "Name" },
    { key: "displayName", type: "string", label: "Display Name" },
    { key: "photoURL", type: "string", label: "Photo URL" },
    { key: "gender", type: "string", label: "Gender" },
    { key: "birthdate", type: "string", label: "Birthdate" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "fetching my profile");
    const client = new CohostClient(ctx);
    return client.request("/me");
  },
};

export default getMe;
