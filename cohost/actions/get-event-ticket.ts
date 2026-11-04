import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { resourceId } from "../lib/resource-id.ts";
import { ticketOutput } from "../lib/params.ts";

interface Input {
  /** Event id or URN — converted to an ID before calling the API. */
  event: string;
  /** Ticket id or URN. */
  ticket: string;
}

/** GET /events/{event}/tickets/{ticket} — fetch a single ticket type. */
const getEventTicket: ActionDefinition<Input> = {
  key: "get-event-ticket",
  type: "read",
  resource: "ticket",
  title: "Get Event Ticket",
  description: "Fetch one ticket type on a Cohost event by id or URN.",
  params: [
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    { key: "ticket", label: "Ticket (ID or URN)", type: "string", required: true },
  ],
  output: ticketOutput,

  async execute(input, ctx) {
    ctx.log("info", "fetching event ticket", { event: input.event, ticket: input.ticket });
    const client = new CohostClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(resourceId(input.event, "events"))}/tickets/${encodeURIComponent(resourceId(input.ticket, "tickets"))}`,
    );
  },
};

export default getEventTicket;
