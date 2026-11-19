import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  data: Record<string, unknown>;
}

/** The keys `POST /v1/orders` takes; anything else would be dropped by the API silently. */
const BODY_KEYS = ["order", "context", "source", "attendees"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * POST /orders — insert or update an order, keyed by `order.urn`.
 *
 * `data` is the request body as is: `{ order, source?, attendees?, context? }` — exactly a
 * transformer's converted `data` (e.g. Eventbrite → Cohost). `order.contextId` may be the
 * event's remote URN; Cohost resolves it to the event it is mapped to. `attendees` (ticket
 * holders bound by `orderItemId`) are folded into their items and become the order's
 * attendees. The order URN is required so a retried step updates instead of duplicating.
 */
const upsertOrder: ActionDefinition<Input> = {
  key: "upsert-order",
  type: "perform",
  resource: "order",
  title: "Upsert Order",
  description:
    "Insert or update a Cohost order by its URN. Pass a transformer's converted data ({ order, source, attendees }) as is; the order's event may be given by its remote URN. Returns the saved order.",
  idempotent: true,
  params: [
    {
      key: "data",
      label: "Order Data",
      type: "json",
      required: true,
      hint: "{ order, source?, attendees?, context? } — e.g. the Eventbrite → Cohost transformer's data. order.urn (the remote order's URN) is required; order.contextId may be the event's remote URN.",
    },
  ],
  output: [
    { key: "order", type: "object", label: "Saved Order" },
    { key: "meta", type: "object", label: "Write Meta (action, changed)" },
  ],
  async execute(input, ctx) {
    const data = input.data;
    if (!isObject(data)) throw new Error("Order Data must be a JSON object: { order, source?, attendees? }.");
    if (!isObject(data.order)) {
      throw new Error("Order Data needs an order object: { order, source?, attendees? } (pass the transformer's data, not data.order).");
    }
    const stray = Object.keys(data).filter((k) => !BODY_KEYS.includes(k));
    if (stray.length) throw new Error(`Order Data takes ${BODY_KEYS.join(", ")}; got ${stray.join(", ")}.`);
    const urn = data.order.urn;
    if (typeof urn !== "string" || !urn) throw new Error("order.urn is required so a retry updates the same order.");
    if (data.attendees !== undefined && !Array.isArray(data.attendees)) throw new Error("attendees must be an array.");

    ctx.log("info", "upserting order", { urn, attendees: Array.isArray(data.attendees) ? data.attendees.length : 0 });
    // ?meta=1 asks for the write meta (create/update + changed fields) alongside the order.
    return new CohostClient(ctx).request("/orders", { method: "POST", query: { meta: 1 }, body: data });
  },
};

export default upsertOrder;
