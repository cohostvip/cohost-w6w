import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  /** Sent flat — the cart endpoints do not wrap their bodies. */
  patch: Record<string, unknown>;
}

/**
 * PATCH /cart/sessions/{session} — update the mutable parts of a cart.
 *
 * Accepts `{ customer, items, customerAnswers, forwarded }`.
 */
const updateCartSession: ActionDefinition<Input> = {
  key: "update-cart-session",
  type: "perform",
  resource: "cart",
  title: "Update Cart Session",
  description: "Update a Cohost cart session (customer, items, answers).",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    {
      key: "patch",
      label: "Changes",
      type: "json",
      required: true,
      hint: 'One or more of { customer, items, customerAnswers, forwarded }.',
    },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "updating cart session", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(`/cart/sessions/${encodeURIComponent(input.session)}`, {
      method: "PATCH",
      body: input.patch,
    });
  },
};

export default updateCartSession;
