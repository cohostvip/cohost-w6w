import type { ActionDefinition } from "@w6w/types";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { EventbriteToCohostResult } from "../lib/resolve.ts";
import type { ConversionContext } from "../../../shared/context.ts";

interface Input {
  data: unknown;
  companyId: string;
  connectionId: string;
  currency?: string;
  /** @deprecated Steps saved before companyId / connectionId were separate fields. */
  context?: ConversionContext;
}

const eventbriteToCohostAction: ActionDefinition<Input, EventbriteToCohostResult> = {
  key: "eventbrite-to-cohost",
  type: "perform",
  resource: "transform",
  title: "Eventbrite → Cohost",
  description: "Detect and convert Eventbrite events, ticket classes, orders, arrays, and listings, including expanded tickets and attendees.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Eventbrite Data (JSON)", type: "json", required: true },
    { key: "companyId", label: "Company ID", type: "string", required: true, default: "{{ const.account_id }}", hint: "The Cohost company the converted objects belong to. Part of each source URN. Defaults to this account." },
    { key: "connectionId", label: "Connection ID", type: "string", required: true, hint: "The Eventbrite connection, e.g. conn_… Part of each source URN." },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for standalone tickets without a cost currency. Nested tickets use the event currency. Defaults to USD." },
  ],

  execute(input) {
    const context = input.context ?? { companyId: input.companyId, connectionId: input.connectionId };
    return eventbriteToCohost(input.data, context, input.currency ?? "USD");
  },
};

export default eventbriteToCohostAction;
