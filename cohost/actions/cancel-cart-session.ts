import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  session: string;
}

/**
 * DELETE /cart/sessions/{session} — soft-delete (cancel) a cart session.
 *
 * Returns no content; the action reports `{ cancelled: true }`.
 */
const cancelCartSession: ActionDefinition<Input> = {
  key: "cancel-cart-session",
  type: "perform",
  resource: "cart",
  title: "Cancel Cart Session",
  description: "Cancel (soft-delete) a Cohost cart session.",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
  ],
  output: [
    { key: "cancelled", type: "boolean", label: "Cancelled" },
    { key: "id", type: "string", label: "Cart Session ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "cancelling cart session", { session: input.session });
    const client = new CohostClient(ctx);
    await client.request(`/cart/sessions/${encodeURIComponent(input.session)}`, {
      method: "DELETE",
    });
    return { cancelled: true, id: input.session };
  },
};

export default cancelCartSession;
