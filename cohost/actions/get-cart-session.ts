import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
}

/** GET /cart/sessions/{session} — read the current cart state. */
const getCartSession: ActionDefinition<Input> = {
  key: "get-cart-session",
  type: "read",
  resource: "cart",
  title: "Get Cart Session",
  description: "Fetch a Cohost cart session by id.",
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "fetching cart session", { session: input.session });
    const client = new CohostClient(ctx);
    return client.request(`/cart/sessions/${encodeURIComponent(input.session)}`);
  },
};

export default getCartSession;
