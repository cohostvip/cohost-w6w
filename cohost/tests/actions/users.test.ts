import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import getMe from "../../actions/get-me.ts";
import getUser from "../../actions/get-user.ts";
import listUsers from "../../actions/list-users.ts";

test("get-me: GETs /me", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "user_1" } }]);
  const out = await getMe.execute({}, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/me");
  expect((out as { uid: string }).uid).toBe("user_1");
});

test("get-user: selects the channel via the x-cohost-channel-id header, not the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "user_1", channelId: "groov" } }]);
  await getUser.execute({ user: "user_1", channelId: "groov" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/users/user_1");
  expect(calls[0].headers["x-cohost-channel-id"]).toBe("groov");
});

test("list-users: paginates with limit/offset, not page/size", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [], pagination: { total: 0 } } }]);
  await listUsers.execute({ channelId: "groov", limit: 10, offset: 20 }, ctx);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/users");
  expect(url.searchParams.get("limit")).toBe("10");
  expect(url.searchParams.get("offset")).toBe("20");
  expect(url.searchParams.get("page")).toBeNull();
  expect(url.searchParams.get("size")).toBeNull();
  expect(calls[0].headers["x-cohost-channel-id"]).toBe("groov");
});

test("list-users: forwards verified=false rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await listUsers.execute({ channelId: "groov", verified: false }, ctx);
  expect(new URL(calls[0].url).searchParams.get("verified")).toBe("false");
});
