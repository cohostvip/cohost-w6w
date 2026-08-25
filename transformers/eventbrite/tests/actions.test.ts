import { expect, test } from "vitest";
import ebEventToCohost from "../actions/eventbrite-event-to-cohost.ts";
import cohostEventToEb from "../actions/cohost-event-to-eventbrite.ts";
import ebTicketToCohost from "../actions/eventbrite-ticket-to-cohost.ts";
import ebOrderToCohost from "../actions/eventbrite-order-to-cohost.ts";
import type { CohostEvent } from "../lib/types.ts";

// Actions are pure transforms: no HookContext needed. Pass `undefined as never`.
const ctx = undefined as never;

test("actions are configured as offline, no-auth, idempotent perform actions", () => {
  for (const a of [ebEventToCohost, cohostEventToEb, ebTicketToCohost, ebOrderToCohost]) {
    expect(a.type).toBe("perform");
    expect(a.requiresAuth).toBe(false);
    expect(a.idempotent).toBe(true);
  }
});

test("eventbrite-event-to-cohost: execute wires to the mapper", async () => {
  const out = (await ebEventToCohost.execute(
    { event: { name: { text: "Demo" }, start: { timezone: "UTC", utc: "2026-01-01T00:00:00Z" }, end: {}, status: "live" } },
    ctx,
  )) as CohostEvent;
  expect(out.name).toBe("Demo");
  expect(out.status).toBe("live");
  expect(out.source).toBe("eventbrite");
});

test("eventbrite-ticket-to-cohost: honors the fallback currency param", async () => {
  const out = await ebTicketToCohost.execute({ ticketClass: { name: "Free", free: true }, currency: "EUR" }, ctx);
  expect((out as { price: string }).price).toBe("EUR,0");
});

test("eventbrite-order-to-cohost: execute wires to the mapper", async () => {
  const out = await ebOrderToCohost.execute(
    { order: { id: "o1", status: "placed", currency: "USD", costs: { base_price: { currency: "USD", value: 100 } } } },
    ctx,
  );
  expect((out as { orderNumber: string }).orderNumber).toBe("o1");
});
