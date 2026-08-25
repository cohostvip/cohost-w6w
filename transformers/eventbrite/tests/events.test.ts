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

test("cohostEventToEventbrite: maps back to Eventbrite shape", () => {
  const back = cohostEventToEventbrite(eventbriteEventToCohost(ebEvent));
  expect(back.name?.text).toBe("Spring Concert");
  expect(back.start?.timezone).toBe("America/New_York");
  expect(back.start?.utc).toBe("2026-05-01T23:00:00Z");
  expect(back.status).toBe("live");
  expect(back.currency).toBe("USD");
  expect(back.logo?.url).toBe("https://img.evbuc.com/orig.jpg");
});

test("cohostEventToEventbrite: cohost-only statuses collapse to nearest Eventbrite status", () => {
  expect(cohostEventToEventbrite({ ...base(), status: "archived" }).status).toBe("ended");
  expect(cohostEventToEventbrite({ ...base(), status: "queued" }).status).toBe("draft");
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
