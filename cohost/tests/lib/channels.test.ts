import { expect, test } from "vitest";
import type { Param } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { channelOptions, resolveChannelFields } from "../../lib/channels.ts";
import type { ResolveFieldsInput } from "../../lib/w6w-fields.ts";

const init = (fields: string[] = ["channelId"]): ResolveFieldsInput => ({
  reason: "init",
  form: {},
  fields,
  unresolved: [],
});

const CHANNELS = [
  { id: "ch_shop", name: "Web shop", type: "website", status: "active" },
  { id: "ch_old", name: "Archive", type: "seller", status: "inactive" },
  { id: "ch_aff", name: "Affiliates", type: "affiliate", status: "active" },
  { id: "ch_bare" },
];

test("resolveChannelFields lists your sales channels as Channel options", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: CHANNELS } }]);

  const out = await resolveChannelFields(init(), ctx);

  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe("GET");
  expect(new URL(calls[0].url).pathname).toBe("/v1/company/sales-channels");
  expect(out).toEqual({
    fields: {
      channelId: {
        options: [
          { value: "ch_aff", label: "Affiliates", description: "affiliate · ch_aff" },
          { value: "ch_bare", label: "ch_bare", description: "ch_bare" },
          { value: "ch_shop", label: "Web shop", description: "website · ch_shop" },
          { value: "ch_old", label: "Archive", description: "seller · inactive · ch_old" },
        ],
      },
    },
  });
});

test("resolveChannelFields answers nothing, and calls nothing, when Channel is not asked for", async () => {
  const { ctx, calls } = mockCtx();
  expect(await resolveChannelFields(init(["other"]), ctx)).toEqual({ fields: {} });
  expect(calls).toHaveLength(0);
});

test("a failed channel list is the Channel field's error, not a thrown hook", async () => {
  const { ctx } = mockCtx([{ status: 403, statusText: "Forbidden", body: { error: "nope" } }]);
  const out = await resolveChannelFields(init(), ctx);
  expect(out.fields.channelId.options).toBeUndefined();
  expect(out.fields.channelId.error).toMatch(/Cohost 403/);
});

test("channelOptions takes a paginated { results } body and skips rows without an id", () => {
  expect(channelOptions({ results: [{ id: "ch_1", name: " Main " }, { name: "no id" }, null] })).toEqual([
    { value: "ch_1", label: "Main", description: "ch_1" },
  ]);
  expect(channelOptions(undefined)).toEqual([]);
});

/** Every form that takes one of your sales channels. */
const CHANNEL_ACTIONS = [
  "assign-price-formula",
  "delete-channel",
  "get-channel",
  "get-channel-event",
  "list-channel-event-listings",
  "list-channel-event-tickets",
  "list-channel-events",
  "remove-channel-event",
  "set-channel-event-visibility",
  "set-channel-listing-properties",
  "update-channel",
];

const channelParamOf = (params: Param[] | undefined) => params?.find((p) => p.key === "channelId");

test.each(CHANNEL_ACTIONS)("%s picks its channel from your sales channels", (key) => {
  const action = app.actions.find((a) => a.key === key);
  expect(action, key).toBeDefined();
  const param = channelParamOf(action!.params);
  expect(param).toMatchObject({
    type: "string",
    required: true,
    options: { source: "resolveFields" },
    config: { allowCustom: true },
  });
  expect(action!.resolveFields).toBe(resolveChannelFields);
});

test("Channel Event Changed declares the same optional Channel picker", () => {
  const trigger = app.triggers?.find((t) => t.key === "channel-event-changed");
  const param = channelParamOf(trigger?.params);
  expect(param).toMatchObject({ options: { source: "resolveFields" }, config: { allowCustom: true } });
  expect(param?.required).toBeUndefined();
  expect(trigger?.resolveFields).toBe(resolveChannelFields);
});

test("the platform-channel profile reads keep a free-text channel id", () => {
  for (const key of ["get-user", "list-users"]) {
    const param = channelParamOf(app.actions.find((a) => a.key === key)?.params);
    expect(param?.options, key).toBeUndefined();
  }
});
