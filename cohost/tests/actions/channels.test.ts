import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import setChannelListingProperties from "../../actions/set-channel-listing-properties.ts";
import app from "../../index.ts";

test("the app registers set-channel-listing-properties", () => {
  expect(app.actions.map((a) => a.key)).toContain("set-channel-listing-properties");
});

test("PATCHes one listing's properties, the primary by default", async () => {
  const stored = { eventId: "ev_1", channelId: "ch_1", listingId: "primary", slug: "fest", properties: { eventbriteId: "eb_1" } };
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: stored } }]);

  const out = await setChannelListingProperties.execute(
    { channelId: "ch_1", eventId: "ev_1", properties: { eventbriteId: "eb_1", page: null } },
    ctx,
  );

  expect(calls[0].method).toBe("PATCH");
  expect(new URL(calls[0].url).pathname).toBe("/v1/company/sales-channels/ch_1/events/ev_1/listings/primary/properties");
  expect(JSON.parse(calls[0].body!)).toEqual({ properties: { eventbriteId: "eb_1", page: null } });
  expect(out).toEqual(stored);
});

test("targets an extra listing by its id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await setChannelListingProperties.execute(
    { channelId: "ch_1", eventId: "ev_1", listingId: "lst vip", properties: { eventbriteId: "eb_2" } },
    ctx,
  );
  expect(new URL(calls[0].url).pathname).toBe("/v1/company/sales-channels/ch_1/events/ev_1/listings/lst%20vip/properties");
});

test("refuses properties that are not an object, without calling Cohost", async () => {
  const { ctx, calls } = mockCtx();
  await expect(
    setChannelListingProperties.execute({ channelId: "ch_1", eventId: "ev_1", properties: ["x"] as any }, ctx),
  ).rejects.toThrow(/must be an object/);
  expect(calls).toHaveLength(0);
});
