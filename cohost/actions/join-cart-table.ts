import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { cartSessionOutput } from "../lib/params.ts";

interface Input {
  session: string;
  tableCommitmentId: string;
}

/** POST /cart/sessions/{session}/join-table — join an existing table commitment. */
const joinCartTable: ActionDefinition<Input> = {
  key: "join-cart-table",
  type: "perform",
  resource: "cart",
  title: "Join Table Commitment",
  description: "Join a table commitment from within a Cohost cart session.",
  idempotent: true,
  params: [
    { key: "session", label: "Cart Session ID", type: "string", required: true },
    { key: "tableCommitmentId", label: "Table Commitment ID", type: "string", required: true },
  ],
  output: cartSessionOutput,

  async execute(input, ctx) {
    ctx.log("info", "joining table commitment", {
      session: input.session,
      tableCommitmentId: input.tableCommitmentId,
    });
    const client = new CohostClient(ctx);
    return client.request(`/cart/sessions/${encodeURIComponent(input.session)}/join-table`, {
      method: "POST",
      body: { tableCommitmentId: input.tableCommitmentId },
    });
  },
};

export default joinCartTable;
