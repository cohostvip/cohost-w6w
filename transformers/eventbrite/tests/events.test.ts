import { expect, test } from "vitest";
import { cohostEventToEventbrite, eventbriteEventToCohost } from "../lib/events.ts";
import type { EbEvent } from "../lib/types.ts";

const ebEvent: EbEvent = {
  id: "ev_123",
  name: { text: "Spring Concert", html: "<b>Spring Concert</b>" },
  summary: "An evening of music",
  description: { html: "<p>Come <i>join</i> us</p>", text: "Come join us" },
  start: { timezone: "America/New_York", utc: "2026-05-01T23:00:00Z" },
  end: { timezone: "America/New_York", utc: "2026-05-02T02:00:00Z" },
  currency: "USD",
  status: "live",
  capacity: 300,
  logo: { url: "https://img.evbuc.com/logo.jpg", original: { url: "https://img.evbuc.com/orig.jpg" } },
};

test("eventbriteEventToCohost: maps core fields", () => {
  const c = eventbriteEventToCohost(ebEvent);
  expect(c.name).toBe("Spring Concert");
  expect(c.summary).toBe("An evening of music");
  expect(c.tz).toBe("America/New_York");
  expect(c.start).toBe("2026-05-01T23:00:00Z");
  expect(c.end).toBe("2026-05-02T02:00:00Z");
  expect(c.status).toBe("live");
  expect(c.currency).toBe("USD");
  expect(c.flyer?.url).toBe("https://img.evbuc.com/orig.jpg");
  expect(c.capacity).toBe(300);
  expect(c.source).toBe("eventbrite");
  expect(c.sourceId).toBe("ev_123");
});

test("eventbriteEventToCohost: unknown status falls back to draft, missing name is safe", () => {
  const c = eventbriteEventToCohost({ status: "weird", start: {}, end: {} });
  expect(c.status).toBe("draft");
  expect(c.name).toBe("Untitled event");
  expect(c.flyer).toBeNull();
});

test("cohostEventToEventbrite: an imported event becomes Update Event inputs", () => {
  expect(cohostEventToEventbrite(eventbriteEventToCohost(ebEvent))).toEqual({
    eventId: "ev_123",
    name: "Spring Concert",
    summary: "An evening of music",
    startUtc: "2026-05-01T23:00:00Z",
    endUtc: "2026-05-02T02:00:00Z",
    timezone: "America/New_York",
    currency: "USD",
    capacity: 300,
  });
});

test("cohostEventToEventbrite: a Cohost-native event becomes Create Event inputs", () => {
  const input = cohostEventToEventbrite({ ...base(), id: "cohost-1", public: true, capacity: null });
  expect(input).not.toHaveProperty("eventId");
  expect(input).toEqual({
    name: "X", summary: "Y", startUtc: "2026-01-01T00:00:00Z", endUtc: "2026-01-01T01:00:00Z",
    timezone: "UTC", currency: "USD", listed: true,
  });
});

test("cohostEventToEventbrite: the event id comes from a connection URN, never a Cohost one", () => {
  expect(cohostEventToEventbrite({ ...base(), urn: "urn:1:co:conn_abc:/events/987" }).eventId).toBe("987");
  expect(cohostEventToEventbrite({ ...base(), urn: "urn:1:co:cohost-falcon:/events/987" })).not.toHaveProperty("eventId");
  expect(cohostEventToEventbrite({ ...base(), source: "other", sourceId: "x" })).not.toHaveProperty("eventId");
});

test("cohostEventToEventbrite: times drop fractional seconds and offsets, as Eventbrite requires", () => {
  const input = cohostEventToEventbrite({ ...base(), start: "2026-10-31T22:00:00.000Z", end: "2026-10-31T21:00:00-05:00" });
  expect(input.startUtc).toBe("2026-10-31T22:00:00Z");
  expect(input.endUtc).toBe("2026-11-01T02:00:00Z");
  expect(() => cohostEventToEventbrite({ ...base(), start: "soon" })).toThrow(/invalid datetime/);
});

test("cohostEventToEventbrite: the summary falls back to the description text, capped at 140", () => {
  const text = (description: unknown) => cohostEventToEventbrite({ ...base(), summary: "", description } as never).summary;
  expect(text({ text: "Bars & bites" })).toBe("Bars & bites");
  expect(text({ html: "<p>Come <i>join</i></p>" })).toBe("Come join");
  expect(text("<b>Hi</b>")).toBe("Hi");
  expect(text("x".repeat(200))).toHaveLength(140);
  expect(cohostEventToEventbrite({ ...base(), summary: "" })).not.toHaveProperty("summary");
  expect(cohostEventToEventbrite({ ...base(), description: { text: "long" } }).summary).toBe("Y");
});

function base() {
  return {
    name: "X",
    summary: "Y",
    tz: "UTC",
    start: "2026-01-01T00:00:00Z",
    end: "2026-01-01T01:00:00Z",
    currency: "USD",
    status: "draft" as const,
  };
}
