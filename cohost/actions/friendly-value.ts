import type { ActionDefinition } from "@w6w/types";
import { type Friendly, toFriendly } from "../lib/friendly.ts";

interface Input {
  value: string;
  timezone?: string;
  locale?: string;
}

type Output = Friendly | { kind: "unknown"; raw: unknown };

/**
 * Convert one value — a Cohost amount (`"USD,5500"`) or a UTC timestamp — into
 * its friendly form. A value that is neither comes back as `{ kind: "unknown" }`.
 * See `lib/friendly.ts` for the shapes.
 */
const friendlyValue: ActionDefinition<Input, Output> = {
  key: "friendly-value",
  type: "perform",
  resource: "format",
  title: "Make Value Friendly",
  description: "Turn a Cohost amount (\"USD,5500\") or a UTC timestamp into display-ready fields: $55, June 14, 2027, in 7mo, and more.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "value", label: "Value", type: "string", required: true, hint: "An amount like USD,5500 or a timestamp like 2027-06-14T23:00:00.000Z." },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/New_York", hint: "IANA zone for the local date fields. Defaults to UTC." },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US", hint: "Language and region for the display strings. Defaults to en-US." },
  ],
  output: [
    { key: "kind", type: "string", label: "Kind (currency, date or unknown)" },
    { key: "display", type: "string", label: "Display (currency)" },
    { key: "displayPadded", type: "string", label: "Display, padded (currency)" },
    { key: "major", type: "number", label: "Major Units (currency)" },
    { key: "value", type: "number", label: "Minor Units (currency)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "isZero", type: "boolean", label: "Is Zero (currency)" },
    { key: "local", type: "string", label: "Local Time (date)" },
    { key: "long", type: "string", label: "Long Format (date)" },
    { key: "dateLong", type: "string", label: "Long Date (date)" },
    { key: "time", type: "string", label: "Time (date)" },
    { key: "relative", type: "object", label: "Relative (date)" },
    { key: "raw", type: "string", label: "Original Value" },
  ],
  sample: {
    kind: "currency",
    value: 5500,
    major: 55,
    display: "$55",
    displayPadded: "$55.00",
    displayCode: "55.00 USD",
    currency: "USD",
    symbol: "$",
    decimals: 2,
    isZero: false,
    isNegative: false,
    raw: "USD,5500",
  },

  execute(input) {
    return toFriendly(input.value, { timezone: input.timezone, locale: input.locale }) ?? { kind: "unknown", raw: input.value };
  },
};

export default friendlyValue;
