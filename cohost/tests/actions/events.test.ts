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

test("search-events: GETs /events/search with q", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await searchEvents.execute({ q: "concert" }, ctx);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe("/v1/events/search");
  expect(url.searchParams.get("q")).toBe("concert");
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
});

test("list-event-tickets: wraps the bare array as { results }", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "tkt_1" }] }]);
  const out = await listEventTickets.execute({ event: "evt_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/evt_1/tickets");
  expect(out).toEqual({ results: [{ id: "tkt_1" }] });
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
