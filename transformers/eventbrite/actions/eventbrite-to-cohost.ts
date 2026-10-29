import type { ActionDefinition } from "@w6w/types";
import { eventbriteToCohost } from "../lib/resolve.ts";
import type { EventbriteToCohostResult } from "../lib/resolve.ts";
import type { ConversionContext } from "../../../shared/context.ts";

interface Input {
  data: unknown;
  context: ConversionContext;
  currency?: string;
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
    { key: "context", label: "Conversion Context (JSON)", type: "json", required: true, hint: "Company ID plus source app, version, action, and connectionId. URNs use companyId and connectionId." },
    { key: "currency", label: "Fallback Currency", type: "string", hint: "Used for standalone tickets without a cost currency. Nested tickets use the event currency. Defaults to USD." },
  ],

  execute(input) {
    return eventbriteToCohost(input.data, input.context, input.currency ?? "USD");
  },
};

export default eventbriteToCohostAction;
