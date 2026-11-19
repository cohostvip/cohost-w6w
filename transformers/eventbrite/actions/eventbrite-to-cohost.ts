import type { ActionDefinition } from "@w6w/types";
import { companyIdParam } from "../lib/params.ts";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { EventbriteToCohostResult } from "../lib/resolve.ts";
import type { ConversionContext } from "../../../shared/context.ts";

interface Input {
  data: unknown;
  companyId: string;
  connectionId: string;
  currency?: string;
  enrich?: boolean;
  /** @deprecated Steps saved before companyId / connectionId were separate fields. */
  context?: ConversionContext;
}

const eventbriteToCohostAction: ActionDefinition<Input, EventbriteToCohostResult> = {
  key: "eventbrite-to-cohost",
  type: "perform",
  resource: "transform",
  title: "Eventbrite → Cohost",
  description: "Detect and convert Eventbrite events, ticket classes, orders, arrays, and listings, including expanded tickets and attendees. An order converts to the body of Cohost's Upsert Order: { order, source, attendees? }.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Eventbrite Data (JSON)", type: "json", required: true },
    companyIdParam("The Cohost company the converted objects belong to. Part of each source URN. Defaults to this account."),
    { key: "connectionId", label: "Connection ID", type: "string", required: true, hint: "The Eventbrite connection, e.g. conn_… Part of each source URN." },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for standalone tickets without a cost currency. Nested tickets use the event currency. Defaults to USD." },
    { key: "enrich", label: "Enrich for insert", type: "boolean", default: false, hint: "Orders: also return the ticket holders as data.attendees (name, email, barcodes, check-in, status), so Cohost creates each attendee with Eventbrite's barcode. Needs the order expanded with attendees." },
  ],

  execute(input) {
    const context = input.context ?? { companyId: input.companyId, connectionId: input.connectionId };
    return eventbriteToCohost(input.data, context, input.currency ?? "USD", { enrich: input.enrich === true });
  },
};

export default eventbriteToCohostAction;
