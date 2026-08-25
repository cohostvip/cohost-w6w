import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Cohost API token auth. The user pastes a Cohost API token; the runtime stores it
 * as an opaque credential and re-hydrates it on every hook call. `sign` attaches it
 * as a bearer token to outbound requests; `test` verifies it against a cheap read.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "Cohost API Token",
  description: "Paste a Cohost API token from your dashboard.",
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Cohost Dashboard → Settings → API keys.",
    },
  ],

  // The only hook handed the raw credential; it runs network-less and just stamps
  // the outbound request. Actions never set this header themselves.
  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  // Verify the token is live with a bounded, authenticated read.
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    const res = await ctx.fetch(`${API_URL}/orders?limit=1`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "token rejected (unauthorized)" };
    }
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    return { ok: true };
  },
};

export default apiToken;
