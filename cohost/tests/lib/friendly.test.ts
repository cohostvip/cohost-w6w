import { describe, expect, test } from "vitest";
import { findTimezone, friendlyData, toFriendly } from "../../lib/friendly.ts";

const NOW = new Date("2026-11-01T12:00:00.000Z");

describe("toFriendly: currency", () => {
  test("a whole amount drops the .00 in display, keeps it padded", () => {
    expect(toFriendly("USD,100")).toEqual({
      kind: "currency",
      value: 100,
      major: 1,
      display: "$1",
      displayPadded: "$1.00",
      displayCode: "1.00 USD",
      currency: "USD",
      symbol: "$",
      decimals: 2,
      isZero: false,
      isNegative: false,
      raw: "USD,100",
    });
  });

  test("a fractional amount shows its cents", () => {
    expect(toFriendly("USD,5550")).toMatchObject({ major: 55.5, display: "$55.50", displayPadded: "$55.50" });
  });

  test("zero and negative amounts are flagged", () => {
    expect(toFriendly("USD,0")).toMatchObject({ isZero: true, display: "$0", displayPadded: "$0.00" });
    expect(toFriendly("USD,-250")).toMatchObject({ isNegative: true, major: -2.5, displayPadded: "-$2.50" });
  });

  test("a zero-decimal currency uses its own precision", () => {
    expect(toFriendly("JPY,500")).toMatchObject({ decimals: 0, major: 500, displayPadded: "¥500" });
  });

  test("three letters that are not a currency are not an amount", () => {
    expect(toFriendly("abc,12")).toBeNull();
  });

  test("the locale shapes the display", () => {
    expect(toFriendly("EUR,123456", { locale: "de-DE" })).toMatchObject({ displayPadded: "1.234,56\u00a0€" });
  });
});

describe("toFriendly: dates", () => {
  test("a UTC timestamp gets local fields, formats and a relative block", () => {
    const d = toFriendly("2027-06-14T23:00:00.000Z", { timezone: "America/Los_Angeles", now: NOW });
    expect(d).toMatchObject({
      kind: "date",
      utc: "2027-06-14T23:00:00.000Z",
      local: "2027-06-14T16:00:00.000-07:00",
      timezone: "America/Los_Angeles",
      timezoneName: "PDT",
      offset: "-07:00",
      isoDate: "2027-06-14",
      time24: "16:00",
      time: "4:00 PM",
      dateLong: "June 14, 2027",
      dateFull: "Monday, June 14, 2027",
      weekday: "Monday",
      monthName: "June",
      year: 2027,
      month: 6,
      day: 14,
      hour: 16,
      raw: "2027-06-14T23:00:00.000Z",
    });
    expect(d && d.kind === "date" && d.relative).toMatchObject({ display: "in 7mo", text: "in 7 months", isPast: false, months: 7, years: 0 });
  });

  test("the local date can land on a different day than UTC", () => {
    expect(toFriendly("2026-11-01T02:00:00Z", { timezone: "America/New_York", now: NOW })).toMatchObject({
      isoDate: "2026-10-31",
      local: "2026-10-31T22:00:00.000-04:00",
    });
  });

  test("a past date counts down with negative units", () => {
    const d = toFriendly("2026-10-23T12:00:00.000Z", { now: NOW });
    expect(d && d.kind === "date" && d.relative).toEqual({
      display: "1w ago",
      text: "last week",
      isPast: true,
      seconds: -777600,
      minutes: -12960,
      hours: -216,
      days: -9,
      weeks: -1,
      months: 0,
      years: 0,
    });
  });

  test("an offset timestamp is normalised to UTC", () => {
    expect(toFriendly("2026-10-17T15:28:08-04:00", { now: NOW })).toMatchObject({ utc: "2026-10-17T19:28:08.000Z", timezone: "UTC" });
  });

  test("an unknown timezone is rejected", () => {
    expect(() => toFriendly("2026-10-17T19:28:08.411Z", { timezone: "Mars/Base" })).toThrow(/unknown timezone/);
  });

  test("a bare date, plain text and non-strings are left alone", () => {
    for (const v of ["2025-12-15", "General Admission", "USD", 5500, null, undefined, {}]) {
      expect(toFriendly(v), JSON.stringify(v)).toBeNull();
    }
  });
});

describe("friendlyData", () => {
  const order = {
    id: "ord_1",
    created: "2026-10-17T19:28:08.411Z",
    version: "2025-12-15",
    costs: { fee: "USD,500", tax: "USD,0", total: "USD,5500" },
    items: [{ quantity: 1, costs: { cost: "USD,5000" }, offering: { name: "General Admission" } }],
    meta: {
      resolvedContext: {
        start: "2027-06-14T23:00:00.000Z",
        location: { timezone: "America/Los_Angeles" },
      },
    },
  };

  test("replaces amounts and timestamps everywhere, keeps the rest", () => {
    const out = friendlyData(order, { now: NOW }) as any;
    expect(out.id).toBe("ord_1");
    expect(out.version).toBe("2025-12-15");
    expect(out.items[0].quantity).toBe(1);
    expect(out.items[0].offering.name).toBe("General Admission");
    expect(out.costs.total.display).toBe("$55");
    expect(out.costs.tax.isZero).toBe(true);
    expect(out.items[0].costs.cost.displayPadded).toBe("$50.00");
    expect(out.meta.resolvedContext.start.time).toBe("4:00 PM");
    expect(out.meta.resolvedContext.location.timezone).toBe("America/Los_Angeles");
  });

  test("times use the zone found in the data", () => {
    const out = friendlyData(order, { now: NOW }) as any;
    expect(out.created.timezone).toBe("America/Los_Angeles");
    expect(out.created.local).toBe("2026-10-17T12:28:08.411-07:00");
  });

  test("an explicit timezone wins over the data's", () => {
    const out = friendlyData(order, { timezone: "America/New_York", now: NOW }) as any;
    expect(out.created.local).toBe("2026-10-17T15:28:08.411-04:00");
  });

  test("does not mutate its input", () => {
    const copy = structuredClone(order);
    friendlyData(order, { now: NOW });
    expect(order).toEqual(copy);
  });

  test("findTimezone skips values that are not a zone", () => {
    expect(findTimezone({ a: { tz: "nope" }, b: [{ timeZone: "Europe/Paris" }] })).toBe("Europe/Paris");
    expect(findTimezone({ a: 1 })).toBeUndefined();
  });
});
