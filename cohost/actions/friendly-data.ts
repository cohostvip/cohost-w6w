import type { ActionDefinition } from "@w6w/types";
import { friendlyData } from "../lib/friendly.ts";

interface Input {
  data: unknown;
  timezone?: string;
  locale?: string;
}

/**
 * Walk any object — an order, event, ticket, a list of them — and replace every
 * Cohost amount and UTC timestamp with its friendly form, leaving every other
 * field as it was. `costs.total` becomes `{ display: "$55", … }`, `created`
 * becomes `{ dateLong: "October 17, 2026", … }`. See `lib/friendly.ts`.
 */
const friendlyDataAction: ActionDefinition<Input> = {
  key: "friendly-data",
  type: "perform",
  resource: "format",
  title: "Make Data Friendly",
  description: "Replace every amount (\"USD,5500\") and UTC timestamp in an order, event, ticket or any object with display-ready fields, so a template can print them without helpers.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "data", label: "Data (JSON)", type: "json", required: true },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/New_York", hint: "IANA zone for the local date fields. Defaults to the first timezone found in the data (an order's event zone), else UTC." },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US", hint: "Language and region for the display strings. Defaults to en-US." },
  ],
  // The result has the shape of whatever went in.
  output: [],

  execute(input) {
    return friendlyData(input.data, { timezone: input.timezone, locale: input.locale });
  },
};

export default friendlyDataAction;
