import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import {
  paginatedOutput,
  paginationParams,
  paginationQuery,
  type PaginationInput,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  status?: string;
  startDate?: string;
  endDate?: string;
}

/** GET /orders — paginated order list with optional status/date filters. */
const listOrders: ActionDefinition<Input> = {
  key: "list-orders",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List Cohost orders, paginated.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "placed", label: "Placed" },
        { value: "voided", label: "Voided" },
        { value: "refunded", label: "Refunded" },
      ],
    },
    { key: "startDate", label: "Start Date", type: "datetime" },
    { key: "endDate", label: "End Date", type: "datetime" },
    ...paginationParams,
  ],
  output: paginatedOutput("Orders"),

  async execute(input, ctx) {
    ctx.log("info", "listing orders", { status: input.status });
    const client = new CohostClient(ctx);
    return client.request("/orders", {
      query: {
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        ...paginationQuery(input),
      },
    });
  },
};

export default listOrders;
