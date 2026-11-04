import { expect, test } from "vitest";
import resourceUriToUrn from "../actions/resource-uri-to-urn.ts";
import { eventbriteToCohost } from "../lib/resolve.ts";
import { resourcePathFromUri } from "../lib/resource-uri.ts";
import type { Converted } from "../lib/resolve.ts";
import { createEventbriteContextFixture } from "./artficats/ebrite_context.ts";
import { createEventbriteFixture } from "./artficats/ebrite_event.ts";

const ctx = undefined as never;
const context = createEventbriteContextFixture();
const prefix = `urn:1:${context.companyId}:${context.connectionId}:`;

test("resource-uri-to-urn: event and ticket class URIs", async () => {
  expect(await resourceUriToUrn.execute(
    { ...context, resourceUri: "https://www.eventbriteapi.com/v3/events/1968211152540/" }, ctx,
  )).toEqual({ urn: `${prefix}/events/1968211152540`, resourcePath: "/events/1968211152540" });
  expect(await resourceUriToUrn.execute(
    { ...context, resourceUri: "https://www.eventbriteapi.com/v3/events/1968211152540/ticket_classes/3458965160/" }, ctx,
  )).toEqual({
    urn: `${prefix}/events/1968211152540/ticket_classes/3458965160`,
    resourcePath: "/events/1968211152540/ticket_classes/3458965160",
  });
});

test("resource-uri-to-urn: matches the URN Eventbrite → Cohost stamps", async () => {
  const input = createEventbriteFixture({ type: "expanded_event" });
  const { data: event } = eventbriteToCohost(input, context) as Converted<"event">;
  const tickets = event.tickets!;
  const base = `https://www.eventbriteapi.com/v3/events/${input.id}/`;
  expect((await resourceUriToUrn.execute({ ...context, resourceUri: base }, ctx)).urn).toBe(event.urn);
  const ticketUri = `${base}ticket_classes/${input.ticket_classes[0].id}/`;
  expect((await resourceUriToUrn.execute({ ...context, resourceUri: ticketUri }, ctx)).urn).toBe(tickets[0].urn);
});

test("resourcePathFromUri: tolerates no trailing slash, a query, and no /v3", () => {
  expect(resourcePathFromUri("https://www.eventbriteapi.com/v3/orders/42?expand=attendees")).toBe("/orders/42");
  expect(resourcePathFromUri(" https://www.eventbriteapi.com/events/7 ")).toBe("/events/7");
});

test("resourcePathFromUri: rejects non-URLs and incomplete paths", () => {
  expect(() => resourcePathFromUri("events/1")).toThrow(/resourceUri/);
  expect(() => resourcePathFromUri("https://www.eventbriteapi.com/v3/")).toThrow(/pairs/);
  expect(() => resourcePathFromUri("https://www.eventbriteapi.com/v3/events/1/ticket_classes/")).toThrow(/pairs/);
});

test("resource-uri-to-urn: validates the company and connection ids", async () => {
  await expect(async () => resourceUriToUrn.execute(
    { companyId: "", connectionId: "c", resourceUri: "https://www.eventbriteapi.com/v3/events/1/" }, ctx,
  )).rejects.toThrow(/companyId/);
});
