import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import getEvent from "../../actions/get-event.ts";
import getEventTicket from "../../actions/get-event-ticket.ts";
import getEventBlocks from "../../actions/get-event-blocks.ts";
import getOrder from "../../actions/get-order.ts";
import getOrganizer from "../../actions/get-organizer.ts";
import getUser from "../../actions/get-user.ts";
import listEventTickets from "../../actions/list-event-tickets.ts";
import listEventAttendees from "../../actions/list-event-attendees.ts";
import listOrderAttendees from "../../actions/list-order-attendees.ts";

const urn = (path: string) => `urn:1:acme-corp:cohost-falcon:${path}`;

test("get-event: converts the trigger URN into an event ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "4Ac2pcLvtWlAqPPuhTcSjO" } }]);
  await getEvent.execute({ event: urn("/events/4Ac2pcLvtWlAqPPuhTcSjO") }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/4Ac2pcLvtWlAqPPuhTcSjO");
});

test("get actions convert each resource URN and preserve headers and query options", async () => {
  const { ctx, calls } = mockCtx(Array.from({ length: 8 }, () => ({ body: {} })));
  await getEventTicket.execute({ event: urn("/events/e"), ticket: urn("/events/e/tickets/t") }, ctx);
  await getEventBlocks.execute({ event: urn("/events/e") }, ctx);
  await getOrder.execute({ order: urn("/orders/o"), uid: "u" }, ctx);
  await getOrganizer.execute({ organizer: urn("/organizers/org") }, ctx);
  await getUser.execute({ user: urn("/users/u"), channelId: "groov" }, ctx);
  await listEventTickets.execute({ event: urn("/events/e") }, ctx);
  await listEventAttendees.execute({ event: urn("/events/e"), page: 2 }, ctx);
  await listOrderAttendees.execute({ order: urn("/orders/o"), uid: "u" }, ctx);
  expect(calls.map(call => new URL(call.url).pathname)).toEqual([
    "/v1/events/e/tickets/t", "/v1/events/e/blocks", "/v1/orders/o", "/v1/organizers/org",
    "/v1/users/u", "/v1/events/e/tickets", "/v1/events/e/attendees", "/v1/orders/o/attendees",
  ]);
  expect(new URL(calls[2].url).searchParams.get("uid")).toBe("u");
  expect(calls[4].headers["x-cohost-channel-id"]).toBe("groov");
  expect(new URL(calls[6].url).searchParams.get("page")).toBe("2");
});

test("get-event: decodes URN IDs once before URL encoding; accepts the legacy service", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getEvent.execute({ event: "urn:1:acme-corp:cohost-puma:/events/event%20one" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/events/event%20one");
});

test.each([
  "urn:broken", urn("/orders/o"), urn("/events/"), urn("/events/.."), urn("/events/%XX"),
])("get-event: rejects malformed or wrong-resource URN %s before fetching", async (event) => {
  const { ctx, calls } = mockCtx([]);
  await expect(getEvent.execute({ event }, ctx)).rejects.toThrow(/URN/);
  expect(calls).toHaveLength(0);
});
