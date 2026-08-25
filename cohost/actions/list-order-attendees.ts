import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import type { Attendee } from "../lib/types.ts";

interface Input {
  order: string;
  /** Optional user id, forwarded as `?uid=` for auth context. */
  uid?: string;
}

/**
 * GET /orders/{order}/attendees — the attendees an order produced.
 *
 * The API answers with a bare array; it is wrapped as `{ results }` to match the
 * other list actions.
 */
const listOrderAttendees: ActionDefinition<Input> = {
  key: "list-order-attendees",
  type: "read",
  resource: "attendee",
  title: "List Order Attendees",
  description: "List the attendees belonging to a Cohost order.",
  params: [
    { key: "order", label: "Order (ID or URN)", type: "string", required: true },
    {
      key: "uid",
      label: "User ID",
      type: "string",
      hint: "Optional. Forwarded as ?uid= for auth context.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Attendees" }],

  async execute(input, ctx) {
    ctx.log("info", "listing order attendees", { order: input.order });
    const client = new CohostClient(ctx);
    const results = await client.request<Attendee[]>(
      `/orders/${encodeURIComponent(input.order)}/attendees`,
      { query: { uid: input.uid } },
    );
    return { results };
  },
};

export default listOrderAttendees;
