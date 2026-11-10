import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import listEvents from "../../actions/list-events.ts";
import getEvent from "../../actions/get-event.ts";
import searchEvents from "../../actions/search-events.ts";
import createEvent from "../../actions/create-event.ts";
import updateEvent from "../../actions/update-event.ts";
import getEventBlocks from "../../actions/get-event-blocks.ts";
import listEventAttendees from "../../actions/list-event-attendees.ts";
import listEventTickets from "../../actions/list-event-tickets.ts";
import getEventTicket from "../../actions/get-event-ticket.ts";
import getEventAttendee from "../../actions/get-event-attendee.ts";
import createEventTickets from "../../actions/create-event-tickets.ts";
import updateEventTicket from "../../actions/update-event-ticket.ts";
import deleteEventTicket from "../../actions/delete-event-ticket.ts";

test("list-events: GETs /events and unwraps the paginated envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "ok", data: [{ id: "evt_1" }], pagination: { page: 1, size: 20, total: 1 } } },
  ]);
  const out = await listEvents.execute({ page: 1, size: 20 }, ctx);
  const url = new URL(calls[0].url);
  expect(calls[0].method).toBe("GET");
  expect(url.pathname).toBe("/v1/events");
  expect(url.searchParams.get("page")).toBe("1");
  expect(url.searchParams.get("size")).toBe("20");
  expect(out).toEqual({ results: [{ id: "evt_1" }], pagination: { page: 1, size: 20, total: 1 } });
});

test("list-events: spreads arbitrary filters into the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listEvents.execute({ filters: { status: "live" } }, ctx);
  expect(new URL(calls[0].url).searchParams.get("status")).toBe("live");
});

test("get-event: GETs /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt_1" } }]);
  const out = await getEvent.execute({ event: "evt_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1");
  expect((out as { id: string }).id).toBe("evt_1");
});

const searchBody = (results: unknown[], total: number, limit: number, offset: number) => ({
  status: "ok",
  data: { results, total, countsByEntityType: { event: total }, limit, offset },
});

test("search-events: GETs /search for events, mapping page/size onto limit/offset", async () => {
  const { ctx, calls } = mockCtx([
    { body: searchBody([{ id: "si_1", entityType: "event", entityId: "evt_6", title: "Concert" }], 13, 5, 5) },
  ]);
  const out = await searchEvents.execute({ q: "concert", page: 2, size: 5 }, ctx);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/search");
  expect(url.searchParams.get("q")).toBe("concert");
  expect(url.searchParams.get("types")).toBe("event");
  expect(url.searchParams.get("limit")).toBe("5");
  expect(url.searchParams.get("offset")).toBe("5");
  expect(out).toEqual({
    results: [{ id: "evt_6", entityType: "event", title: "Concert" }],
    pagination: { page: 2, size: 5, total: 13 },
  });
});

test("search-events: defaults to page 1 / size 20 and clamps size to 100", async () => {
  const { ctx, calls } = mockCtx([{ body: searchBody([], 0, 20, 0) }, { body: searchBody([], 0, 100, 0) }]);
  const first = await searchEvents.execute({ q: "x" }, ctx);
  expect(new URL(calls[0].url).searchParams.get("limit")).toBe("20");
  expect(new URL(calls[0].url).searchParams.get("offset")).toBe("0");
  expect(first).toEqual({ results: [], pagination: { page: 1, size: 20, total: 0 } });

  const clamped = await searchEvents.execute({ q: "x", page: 3, size: 500 }, ctx);
  expect(new URL(calls[1].url).searchParams.get("limit")).toBe("100");
  expect(new URL(calls[1].url).searchParams.get("offset")).toBe("200");
  expect(clamped).toMatchObject({ pagination: { page: 3, size: 100 } });
});

test("create-event: POSTs /events with the { event, context } wrapper", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt_new" } }]);
  await createEvent.execute({ event: { name: "Gala" }, context: { source: "w6w" } }, ctx);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/events");
  expect(JSON.parse(calls[0].body!)).toEqual({
    event: { name: "Gala" },
    context: { source: "w6w" },
  });
});

test("update-event: PATCHes /events/{id} with the { event } wrapper", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt_1" } }]);
  await updateEvent.execute({ event: "evt_1", patch: { capacity: 500 } }, ctx);
  expect(calls[0].method).toBe("PATCH");
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1");
  expect(JSON.parse(calls[0].body!).event).toEqual({ capacity: 500 });
});

test("get-event-blocks: GETs /events/{id}/blocks and keeps the { blocks } envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { blocks: [{ id: "blk_1" }] } }]);
  const out = await getEventBlocks.execute({ event: "evt_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/blocks");
  expect(out).toEqual({ blocks: [{ id: "blk_1" }] });
});

test("list-event-attendees: GETs /events/{id}/attendees", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listEventAttendees.execute({ event: "evt_1", page: 2 }, ctx);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/events/evt_1/attendees");
  expect(url.searchParams.get("page")).toBe("2");
  // A page without a size still pages — the attendees endpoint only paginates on a size.
  expect(url.searchParams.get("size")).toBe("20");
});

test("list-event-attendees: forwards page + size and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "ok", data: [{ id: "a.5" }], pagination: { page: 2, size: 5, total: 13, pageCount: 3 } } },
  ]);
  const out = await listEventAttendees.execute({ event: "evt_1", page: 2, size: 5 }, ctx);
  const url = new URL(calls[0].url);
  expect(url.searchParams.get("page")).toBe("2");
  expect(url.searchParams.get("size")).toBe("5");
  expect(out).toEqual({ results: [{ id: "a.5" }], pagination: { page: 2, size: 5, total: 13, pageCount: 3 } });
});

test("list-event-attendees: sends no pagination when none is set (full list)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listEventAttendees.execute({ event: "evt_1" }, ctx);
  expect(new URL(calls[0].url).search).toBe("");
});

test("pagination params: page + size only — no continuation token (no endpoint issues one)", () => {
  for (const action of [listEvents, listEventAttendees, searchEvents]) {
    const keys = (action.params ?? []).map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(["page", "size"]));
    expect(keys).not.toContain("continuation");
  }
});

test("list-event-tickets: wraps the bare array as { results }", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "tkt_1" }] }]);
  const out = await listEventTickets.execute({ event: "evt_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/tickets");
  expect(out).toEqual({ results: [{ id: "tkt_1" }] });
});

test("get-event-ticket: GETs /events/{event}/tickets/{ticket}, extracting IDs from URNs", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: { id: "tkt_1" } } }, { body: {} }]);
  const out = await getEventTicket.execute({ event: "evt_1", ticket: "tkt_1" }, ctx);
  expect(calls[0].method).toBe("GET");
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/tickets/tkt_1");
  expect(out).toEqual({ id: "tkt_1" });
  const urn = "urn:1:co:cohost-falcon:/events/evt_1/tickets/t";
  await getEventTicket.execute({ event: "evt_1", ticket: urn }, ctx);
  expect(new URL(calls[1].url).pathname).toBe("/v1/events/evt_1/tickets/t");
});

test("get-event-attendee: GETs /events/{event}/attendees/{attendee}, extracting IDs from URNs", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: { id: "item_1.0" } } }, { body: {} }]);
  const out = await getEventAttendee.execute({ event: "evt_1", attendee: "item_1.0" }, ctx);
  expect(calls[0].method).toBe("GET");
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/attendees/item_1.0");
  expect(out).toEqual({ id: "item_1.0" });
  await getEventAttendee.execute(
    { event: "urn:1:co:cohost-falcon:/events/evt_1", attendee: "urn:1:co:cohost-falcon:/events/evt_1/attendees/a1" },
    ctx,
  );
  expect(new URL(calls[1].url).pathname).toBe("/v1/events/evt_1/attendees/a1");
});

test("create-event-tickets: a single ticket is sent as { ticket }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ids: {} } }]);
  await createEventTickets.execute({ event: "evt_1", tickets: { name: "GA" } }, ctx);
  const body = JSON.parse(calls[0].body!);
  expect(body.ticket).toEqual({ name: "GA" });
  expect(body.tickets).toBeUndefined();
});

test("create-event-tickets: an array is sent as { tickets }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ids: {} } }]);
  await createEventTickets.execute({ event: "evt_1", tickets: [{ name: "VIP" }] }, ctx);
  const body = JSON.parse(calls[0].body!);
  expect(body.tickets).toEqual([{ name: "VIP" }]);
  expect(body.ticket).toBeUndefined();
});

test("update-event-ticket: PATCHes the nested ticket path with the { ticket } wrapper", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tkt_1" } }]);
  await updateEventTicket.execute({ event: "evt_1", ticket: "tkt_1", patch: { capacity: 9 } }, ctx);
  expect(calls[0].method).toBe("PATCH");
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/tickets/tkt_1");
  expect(JSON.parse(calls[0].body!).ticket).toEqual({ capacity: 9 });
});

test("delete-event-ticket: DELETEs and reports the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await deleteEventTicket.execute({ event: "evt_1", ticket: "tkt_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/tickets/tkt_1");
  expect(out).toEqual({ deleted: true, id: "tkt_1" });
});
