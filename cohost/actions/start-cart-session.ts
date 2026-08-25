import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  /** The event (or other purchasable context) the cart is for. */
  contextId: string;
  sessionContext?: Record<string, unknown>;
}

/**
 * POST /cart/sessions — open a cart session.
 *
 * First step of the checkout state machine: start → update items → pre-validate
 * → payment intent → process payment → place order.
 */
const startCartSession: ActionDefinition<Input> = {
  key: "start-cart-session",
  type: "perform",
  resource: "cart",
  title: "Start Cart Session",
  description: "Open a new Cohost cart session for a purchasable context.",
  idempotent: false,
  params: [
    {
      key: "contextId",
      label: "Context ID",
      type: "string",
      required: true,
      hint: "Usually the event id the cart is being opened against.",
    },
    {
      key: "sessionContext",
      label: "Session Context",
      type: "json",
      hint: 'Optional { userAgent, referrer, originDomain, tracking, forward }.',
    },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "starting cart session", { contextId: input.contextId });
    const client = new CohostClient(ctx);
    return client.request("/cart/sessions", {
      method: "POST",
      body: { contextId: input.contextId, sessionContext: input.sessionContext },
    });
  },
};

export default startCartSession;
