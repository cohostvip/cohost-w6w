import { expect, test } from "vitest";
import type { SignableRequest } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import apiToken from "../../auth/api-token.ts";

test("api-token.sign: injects a bearer Authorization header", () => {
  const request: SignableRequest = {
    url: "https://api.cohost.vip/v1/orders/ord_1",
    method: "GET",
    headers: {},
  };
  const signed = apiToken.sign!({ request, credential: { token: "tok_123" } }, undefined as never);
  // sign is synchronous here.
  expect((signed as SignableRequest).headers["authorization"]).toBe("Bearer tok_123");
});

test("api-token.test: ok on a successful authed read", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  const res = await apiToken.test!({ credential: { token: "tok_123" } }, ctx);
  expect(res).toEqual({ ok: true });
  expect(calls[0].headers["authorization"]).toBe("Bearer tok_123");
});

test("api-token.test: fails on 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "nope" } }]);
  const res = await apiToken.test!({ credential: { token: "bad" } }, ctx);
  expect(res.ok).toBe(false);
});

test("api-token.test: fails when the credential has no token", async () => {
  const { ctx } = mockCtx([]);
  const res = await apiToken.test!({ credential: {} }, ctx);
  expect(res.ok).toBe(false);
});
