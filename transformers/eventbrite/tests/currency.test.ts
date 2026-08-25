import { expect, test } from "vitest";
import { amountValue, cohostAmount, cohostToEbAmount, ebToCohostAmount } from "../lib/currency.ts";

test("ebToCohostAmount: money object → 'USD,1000'", () => {
  expect(ebToCohostAmount({ currency: "USD", value: 1000 })).toBe("USD,1000");
  expect(ebToCohostAmount({ currency: "eur", value: 250 })).toBe("EUR,250");
});

test("ebToCohostAmount: null/zero falls back to currency and 0", () => {
  expect(ebToCohostAmount(null)).toBe("USD,0");
  expect(ebToCohostAmount(undefined, "GBP")).toBe("GBP,0");
});

test("cohostToEbAmount: 'USD,1000' → money object", () => {
  expect(cohostToEbAmount("USD,1000")).toEqual({
    currency: "USD",
    value: 1000,
    major_value: "10.00",
    display: "10.00 USD",
  });
});

test("cohostToEbAmount: throws on a malformed amount", () => {
  expect(() => cohostToEbAmount("1000")).toThrow();
  expect(() => cohostToEbAmount("USD 1000")).toThrow();
});

test("round-trips minor units losslessly", () => {
  const back = ebToCohostAmount(cohostToEbAmount("EUR,4321"));
  expect(back).toBe("EUR,4321");
});

test("amountValue / cohostAmount helpers", () => {
  expect(amountValue("USD,750")).toBe(750);
  expect(amountValue("garbage")).toBe(0);
  expect(cohostAmount("usd", 1234)).toBe("USD,1234");
});
