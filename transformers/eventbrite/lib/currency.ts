/**
 * Money conversions between the two representations.
 *
 * - Cohost: a single string `"USD,1000"` — ISO currency, a comma, then the value
 *   in **minor units** (cents). See `currencyAmountSchema` in `@cohostvip/types`.
 * - Eventbrite: an object `{ currency, value, major_value, display }` where
 *   `value` is minor units.
 *
 * Minor units carry across unchanged, so these conversions are lossless and
 * exactly invertible for the fields both sides share.
 */
import type { EbCurrency } from "./types.ts";

const COHOST_AMOUNT = /^([A-Za-z]{3}),(\d+)$/;

/** `{ currency, value }` → `"USD,1000"`. Falls back to `fallbackCurrency` + `0`. */
export function ebToCohostAmount(cost: EbCurrency | null | undefined, fallbackCurrency = "USD"): string {
  const currency = (cost?.currency ?? fallbackCurrency).toUpperCase();
  const value = Math.max(0, Math.round(cost?.value ?? 0));
  return `${currency},${value}`;
}

/** `"USD,1000"` → `{ currency, value, major_value, display }`. Throws on a malformed string. */
export function cohostToEbAmount(amount: string): Required<EbCurrency> {
  const m = COHOST_AMOUNT.exec(amount?.trim() ?? "");
  if (!m) {
    throw new Error(`invalid Cohost currency amount: ${JSON.stringify(amount)} (expected "USD,1000")`);
  }
  const currency = m[1].toUpperCase();
  const value = Number(m[2]);
  const major = value / 100;
  const majorValue = major.toFixed(2);
  return {
    currency,
    value,
    major_value: majorValue,
    display: `${majorValue} ${currency}`,
  };
}

/** Parse the minor-unit integer out of a Cohost amount string; `0` if unset/invalid. */
export function amountValue(amount: string | null | undefined): number {
  const m = COHOST_AMOUNT.exec(amount?.trim() ?? "");
  return m ? Number(m[2]) : 0;
}

/** Build a Cohost amount string from a minor-unit integer. */
export function cohostAmount(currency: string, minorUnits: number): string {
  return `${currency.toUpperCase()},${Math.max(0, Math.round(minorUnits))}`;
}
