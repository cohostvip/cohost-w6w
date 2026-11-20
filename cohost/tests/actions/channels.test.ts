import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import setChannelListingProperties from "../../actions/set-channel-listing-properties.ts";
import getChannelEvent from "../../actions/get-channel-event.ts";
import listChannelEventTickets from "../../actions/list-channel-event-tickets.ts";
import app from "../../index.ts";
import listChannels from "../../actions/list-channels.ts";
import getChannel from "../../actions/get-channel.ts";
import createChannel from "../../actions/create-channel.ts";
import updateChannel from "../../actions/update-channel.ts";
import deleteChannel from "../../actions/delete-channel.ts";
import listChannelEvents from "../../actions/list-channel-events.ts";
import listChannelEventListings from "../../actions/list-channel-event-listings.ts";
import setChannelEventVisibility from "../../actions/set-channel-event-visibility.ts";
import removeChannelEvent from "../../actions/remove-channel-event.ts";

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

const channelTickets = [
  { id: "tkt_ga", name: "GA", status: "live", costs: { cost: "USD,1100", fee: "USD,99", total: "USD,1199" } },
  { id: "tkt_vip", name: "VIP", status: "sold-out", costs: { cost: "USD,6000", fee: "USD,0", total: "USD,6000" } },
];

test("the app registers the channel views", () => {
  const keys = app.actions.map((a) => a.key);
  expect(keys).toContain("get-channel-event");
  expect(keys).toContain("list-channel-event-tickets");
});

test("gets the event as the channel shows it, with its tickets at channel prices", async () => {
  const event = { id: "ev_1", name: "Fest on Groov", ticketPrices: ["USD,1100"], salesEnabled: true };
  const { ctx, calls } = mockCtx([
    { body: { status: "ok", data: event } },
    { body: { status: "ok", data: channelTickets } },
  ]);

  const out = await getChannelEvent.execute({ channelId: " ch_1 ", event: "ev_1" }, ctx);

  expect(calls.map((c) => new URL(c.url).pathname).sort()).toEqual(["/v1/events/ev_1", "/v1/events/ev_1/tickets"]);
  for (const call of calls) {
    expect(call.method).toBe("GET");
    expect(call.headers["x-cohost-channel-id"]).toBe("ch_1");
  }
  expect(out).toEqual({ ...event, tickets: channelTickets });
});

test("fetches an extra listing by its id, and takes an event URN", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: {} } }, { body: { status: "ok", data: [] } }]);
  await getChannelEvent.execute({ channelId: "ch_1", event: "urn:1:co:cohost-falcon:/events/ev_9", listingId: "vip1" }, ctx);
  for (const call of calls) {
    const url = new URL(call.url);
    expect(url.pathname.startsWith("/v1/events/ev_9")).toBe(true);
    expect(url.searchParams.get("listingId")).toBe("vip1");
  }
});

test("says plainly when the channel does not show the event", async () => {
  const notFound = { status: 404, body: { status: "error", error: { message: "Event not found" } } };
  const { ctx } = mockCtx([notFound, notFound]);
  await expect(getChannelEvent.execute({ channelId: "ch_1", event: "ev_1" }, ctx)).rejects.toThrow(
    "Event ev_1 is not shown on channel ch_1: not listed there, hidden, or not live",
  );
});

test("lists only the channel's tickets for a listing, as results", async () => {
  const paused = channelTickets.map((t) => ({ ...t, status: "unavailable" }));
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: paused } }]);

  const out = await listChannelEventTickets.execute({ channelId: "ch_1", event: "ev_1", listingId: "vip1" }, ctx);

  expect(calls).toHaveLength(1);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/events/ev_1/tickets");
  expect(url.searchParams.get("listingId")).toBe("vip1");
  expect(calls[0].headers["x-cohost-channel-id"]).toBe("ch_1");
  expect(out).toEqual({ results: paused });
});

test("list-channel-event-tickets fails clearly when the channel does not show the listing", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: "error", error: { message: "Event not found" } } }]);
  await expect(
    listChannelEventTickets.execute({ channelId: "ch_1", event: "ev_1", listingId: "vip1" }, ctx),
  ).rejects.toThrow("Event ev_1 (listing vip1) is not shown on channel ch_1");
});

// ---- channels -------------------------------------------------------------------------------

const ok = (data: unknown) => ({ body: { status: "ok", data } });
const path = (url: string) => new URL(url).pathname;

test("lists the company's channels as results, optionally by type", async () => {
  const channels = [{ id: "ch_1", name: "Eventbrite", type: "api" }];
  const { ctx, calls } = mockCtx([ok(channels), ok([])]);

  expect(await listChannels.execute({}, ctx)).toEqual({ results: channels });
  await listChannels.execute({ type: "api" }, ctx);

  expect(path(calls[0].url)).toBe("/v1/company/sales-channels");
  expect(new URL(calls[0].url).search).toBe("");
  expect(new URL(calls[1].url).searchParams.get("type")).toBe("api");
});

test("gets one channel", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "ch 1", name: "Eventbrite" })]);
  expect(await getChannel.execute({ channelId: "ch 1" }, ctx)).toMatchObject({ name: "Eventbrite" });
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels/ch%201");
});

test("creates a channel from the named fields, other fields merged under them", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "ch_new" })]);
  await createChannel.execute(
    {
      name: " Eventbrite ",
      type: "api",
      description: "Mirror to EB",
      isPublic: false,
      fields: { tags: ["eb"], name: "ignored" },
    },
    ctx,
  );
  expect(calls[0].method).toBe("POST");
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels");
  expect(JSON.parse(calls[0].body!)).toEqual({
    channel: { tags: ["eb"], name: "Eventbrite", type: "api", description: "Mirror to EB", isPublic: false },
  });
});

test("updates only the fields given", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "ch_1" })]);
  await updateChannel.execute({ channelId: "ch_1", status: "inactive", changes: { tags: ["x"] } }, ctx);
  expect(calls[0].method).toBe("PUT");
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels/ch_1");
  expect(JSON.parse(calls[0].body!)).toEqual({ channel: { tags: ["x"], status: "inactive" } });
});

test("sets, replaces and clears the channel's default price modifier", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "ch_1" }), ok({ id: "ch_1" }), ok({ id: "ch_1" }), ok({ id: "ch_1" })]);
  await updateChannel.execute({ channelId: "ch_1", pricingFormulaId: " pf_eb ", pricingMarkupPercent: 10 }, ctx);
  await updateChannel.execute({ channelId: "ch_1", pricingMarkupPercent: 12.5 }, ctx);
  await updateChannel.execute({ channelId: "ch_1", pricingMarkupPercent: 0 }, ctx);
  await updateChannel.execute({ channelId: "ch_1", clearPricing: true, pricingMarkupPercent: 5 }, ctx);
  expect(calls.map((call) => JSON.parse(call.body!).channel.pricing)).toEqual([
    { formulaId: "pf_eb" },
    { markupPercent: 12.5 },
    null,
    null,
  ]);
});

test("creates a channel with a default markup, and refuses an out-of-range one without calling Cohost", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "ch_new" })]);
  await createChannel.execute({ name: "EB", type: "api", pricingMarkupPercent: 15 }, ctx);
  expect(JSON.parse(calls[0].body!).channel.pricing).toEqual({ markupPercent: 15 });

  await expect(createChannel.execute({ name: "EB", type: "api", pricingMarkupPercent: 2000 }, ctx)).rejects.toThrow(
    /from 0 to 1000/,
  );
  expect(calls).toHaveLength(1);
});

test("refuses an update with nothing to change, without calling Cohost", async () => {
  const { ctx, calls } = mockCtx();
  await expect(updateChannel.execute({ channelId: "ch_1" }, ctx)).rejects.toThrow(/Nothing to change/);
  expect(calls).toHaveLength(0);
});

test("deletes a channel", async () => {
  const { ctx, calls } = mockCtx([ok(null)]);
  expect(await deleteChannel.execute({ channelId: "ch_1" }, ctx)).toEqual({ deleted: true, id: "ch_1" });
  expect(calls[0].method).toBe("DELETE");
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels/ch_1");
});

test("lists a channel's events one page at a time", async () => {
  const items = [{ id: "ev_1", name: "Fest", listing: { visibility: "visible" } }];
  const { ctx, calls } = mockCtx([ok({ items, total: 41 })]);

  const out = await listChannelEvents.execute(
    { channelId: "ch_1", status: "live, ended", orderBy: "start", order: "asc", limit: 20, offset: 20 },
    ctx,
  );

  expect(out).toEqual({ results: items, total: 41 });
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/company/sales-channels/ch_1/events");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    status: "live,ended",
    orderBy: "start",
    order: "asc",
    limit: "20",
    offset: "20",
  });
});

test("lists an event's listings on a channel, taking an event URN", async () => {
  const listings = [{ eventId: "ev_9", channelId: "ch_1", listingId: "primary", slug: "fest", properties: {} }];
  const { ctx, calls } = mockCtx([ok(listings)]);
  const out = await listChannelEventListings.execute(
    { channelId: "ch_1", event: "urn:1:co:cohost-falcon:/events/ev_9" },
    ctx,
  );
  expect(out).toEqual({ results: listings });
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels/ch_1/events/ev_9/listings");
});

test("hides or shows an event on a channel", async () => {
  const { ctx, calls } = mockCtx([ok({ eventId: "ev_1", channelId: "ch_1", visibility: "hidden" })]);
  const out = await setChannelEventVisibility.execute({ channelId: "ch_1", event: "ev_1", visibility: "hidden" }, ctx);
  expect(out).toMatchObject({ visibility: "hidden" });
  expect(calls[0].method).toBe("PATCH");
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels/ch_1/events/ev_1/listing");
  expect(JSON.parse(calls[0].body!)).toEqual({ visibility: "hidden" });
});

test("removes an event from a channel", async () => {
  const { ctx, calls } = mockCtx([ok(null)]);
  const out = await removeChannelEvent.execute({ channelId: "ch_1", event: "ev_1" }, ctx);
  expect(out).toEqual({ removed: true, eventId: "ev_1", channelId: "ch_1" });
  expect(calls[0].method).toBe("DELETE");
  expect(path(calls[0].url)).toBe("/v1/company/sales-channels/ch_1/events/ev_1");
});
