import type { AuthDefinition } from "@w6w/types";
import apiToken from "./api-token.ts";

/**
 * `tenantAuth` is in w6w-core (`packages/types/src/auth.ts`) but not yet in the published
 * `@w6w/types@0.1.0`; this mirrors it. Use `AuthDefinition` directly once it is published.
 */
type TenantAuthDefinition = Omit<AuthDefinition, "type"> & {
  type: "tenantAuth";
  tenantAuth: { link?: string; resourcePrefix?: string };
};

/**
 * Signed in through the Cohost tenant: W6W mints a per-user Cohost API token from Cohost's
 * token endpoint at run time. Nothing is entered by the user and nothing is stored.
 */
const tenant: TenantAuthDefinition = {
  key: "cohost",
  type: "tenantAuth",
  displayName: "Cohost account",
  description: "Uses the Cohost account you are signed in with.",
  tenantAuth: { link: "vip.cohost.w6w" },

  // W6W hands the minted token over in the same shape as a bearer credential.
  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  // The minted token has the same shape as a pasted one, so verify it the same way.
  test: apiToken.test,
};

export default tenant as unknown as AuthDefinition;
