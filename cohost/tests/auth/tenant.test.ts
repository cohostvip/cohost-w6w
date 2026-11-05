import { expect, test } from "vitest";
import type { SignableRequest } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import tenant from "../../auth/tenant.ts";
import app from "../../index.ts";

test("tenant.sign: injects the minted token as a bearer Authorization header", () => {
  const request: SignableRequest = {
    url: "https://api.cohost.vip/v1/events",
    method: "GET",
    headers: {},
  };
  const signed = tenant.sign!({ request, credential: { token: "minted_123" } }, undefined as never);
  expect((signed as SignableRequest).headers["authorization"]).toBe("Bearer minted_123");
});

test("tenant auth is the default method and api-token remains available", () => {
  expect(app.auth?.map(auth => auth.key)).toEqual(["cohost", "api-token"]);
  expect(tenant).toMatchObject({ type: "tenantAuth", tenantAuth: { link: "vip.cohost.w6w" } });
  expect(tenant).not.toHaveProperty("fields");
});

test("tenant.test: verifies the minted token with an authed read", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  expect(await tenant.test!({ credential: { token: "minted_123" } }, ctx)).toEqual({ ok: true });
  expect(calls[0].headers["authorization"]).toBe("Bearer minted_123");
});
