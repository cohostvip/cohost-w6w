import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  itemId: string;
  quantity: number;
  options?: Record<string, unknown>;
}

/**
 * POST /cart/sessions/{session}/item — set the quantity of one cart item.
 *
 * This is an absolute set, not a delta — `quantity: 0` removes the item, which
 * is exactly what the SDK's `cart.deleteItem()` convenience wrapper does (it is
 * not a separate endpoint, so it is not a separate action).
 */
const updateCartItem: ActionDefinition<Input> = {
  key: "update-cart-item",
  type: "perform",
  resource: "cart",
  title: "Update Cart Item",
  description: "Set the quantity of an item in a Cohost cart session (0 removes it).",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      hint: "Absolute quantity, not a delta. 0 removes the item.",
      validation: { integer: true, min: 0 },
    },
    { key: "options", label: "Options", type: "json", hint: "Optional per-item options." },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "updating cart item", {
      session: input.session,
      itemId: input.itemId,
      quantity: input.quantity,
    });
    const client = new CohostClient(ctx);
    return client.request(`/cart/sessions/${encodeURIComponent(input.session)}/item`, {
      method: "POST",
      body: { itemId: input.itemId, quantity: input.quantity, options: input.options },
    });
  },
};

export default updateCartItem;
