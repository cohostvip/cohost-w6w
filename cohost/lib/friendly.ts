/**
 * Friendly values — turn Cohost's machine formats into something a template can
 * print without helpers.
 *
 * `@w6w/template` is plain Handlebars: it has none of the `chCurrency` /
 * `chDate` / `chIsFree` helpers Cohost's own renderer registers
 * (`packages/utils/src/handlebars/helpers.ts` in the monorepo). Instead of
 * formatting at render time, a workflow runs its data through `friendly-data`
 * first, and the template reads ready-made fields: `{{order.costs.total.display}}`,
 * `{{#if order.costs.fee.isZero}}`, `{{event.start.dateLong}}`.
 *
 * Two shapes are recognised, both as strings:
 * - a Cohost amount, `"USD,5500"` — ISO currency, a comma, the value in minor
 *   units (cents), see `currencyAmountSchema` in `@cohostvip/types`;
 * - an ISO-8601 timestamp WITH a time and a zone (`Z` or `±hh:mm`). A bare date
 *   (`"2025-12-15"`, Cohost's `version` field) is left alone — it names a day,
 *   not an instant, and has no timezone to convert from.
 */

export interface FriendlyCurrency {
  kind: "currency";
  /** Minor units (cents), as stored. */
  value: number;
  /** Major units: `5500` → `55`. */
  major: number;
  /** `$55`, or `$55.50` — no trailing `.00` on a whole amount. */
  display: string;
  /** Always the currency's full precision: `$55.00`. */
  displayPadded: string;
  /** `55.00 USD`. */
  displayCode: string;
  currency: string;
  symbol: string;
  /** Minor-unit digits for the currency: 2 for USD, 0 for JPY. */
  decimals: number;
  isZero: boolean;
  isNegative: boolean;
  raw: string;
}

export interface FriendlyRelative {
  /** Compact: `in 7mo`, `2w ago`, `now`. */
  display: string;
  /** Spelled out in the locale: `in 7 months`, `2 weeks ago`, `tomorrow`. */
  text: string;
  isPast: boolean;
  /** Whole units between now and the date — positive ahead, negative behind. */
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  weeks: number;
  months: number;
  years: number;
}

export interface FriendlyDate {
  kind: "date";
  /** The instant, normalised to UTC: `2027-06-14T23:00:00.000Z`. */
  utc: string;
  /** The same instant in `timezone`, with its offset: `2027-06-14T16:00:00.000-07:00`. */
  local: string;
  timezone: string;
  /** `PDT`, or `GMT+2` where the locale has no abbreviation. */
  timezoneName: string;
  /** `-07:00`. */
  offset: string;
  /** Milliseconds since the epoch. */
  epoch: number;
  /** `6/14/27, 4:00 PM` */
  short: string;
  /** `Jun 14, 2027, 4:00 PM` */
  medium: string;
  /** `June 14, 2027 at 4:00 PM` */
  long: string;
  /** `Monday, June 14, 2027 at 4:00 PM` */
  full: string;
  /** `6/14/27` */
  dateShort: string;
  /** `Jun 14, 2027` */
  dateMedium: string;
  /** `June 14, 2027` */
  dateLong: string;
  /** `Monday, June 14, 2027` */
  dateFull: string;
  /** `4:00 PM` */
  time: string;
  /** `16:00` */
  time24: string;
  /** `2027-06-14` */
  isoDate: string;
  year: number;
  /** 1–12. */
  month: number;
  /** `June` */
  monthName: string;
  /** `Jun` */
  monthShort: string;
  day: number;
  /** `Monday` */
  weekday: string;
  /** `Mon` */
  weekdayShort: string;
  hour: number;
  minute: number;
  relative: FriendlyRelative;
  raw: string;
}

export type Friendly = FriendlyCurrency | FriendlyDate;

export interface FriendlyOptions {
  /** IANA zone the local fields are shown in. Defaults to UTC (`friendlyData` looks in the data first). */
  timezone?: string;
  /** BCP-47 locale for every display string. Defaults to `en-US`. */
  locale?: string;
  /** The instant `relative` is measured from. Defaults to the current time. */
  now?: Date;
}

const AMOUNT = /^([A-Za-z]{3}),(-?\d+)$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const DEFAULT_LOCALE = "en-US";

/** True when `tz` is a zone `Intl` can render in. */
export function isTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function resolveTimezone(tz: string | undefined): string {
  if (tz === undefined || tz === "") return "UTC";
  if (!isTimezone(tz)) throw new Error(`unknown timezone: ${JSON.stringify(tz)} (expected an IANA zone like "America/New_York")`);
  return tz;
}

// `Intl.NumberFormat` formats any three letters as a "currency", so the ISO list
// is what tells `"USD,100"` apart from an unrelated `"abc,12"`.
let currencies: Set<string> | undefined;
const isCurrency = (code: string) => (currencies ??= new Set(Intl.supportedValuesOf("currency"))).has(code);

function friendlyCurrency(raw: string, currency: string, value: number, locale: string): FriendlyCurrency | null {
  if (!isCurrency(currency)) return null;
  const padded = new Intl.NumberFormat(locale, { style: "currency", currency });
  const decimals = padded.resolvedOptions().maximumFractionDigits ?? 2;
  const major = value / 10 ** decimals;
  const whole = Number.isInteger(major);
  const display = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : decimals,
    maximumFractionDigits: decimals,
  }).format(major);
  const symbol = padded.formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
  return {
    kind: "currency",
    value,
    major,
    display,
    displayPadded: padded.format(major),
    displayCode: `${major.toFixed(decimals)} ${currency}`,
    currency,
    symbol,
    decimals,
    isZero: value === 0,
    isNegative: value < 0,
    raw,
  };
}

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

/** Wall-clock parts of `date` in `timeZone` — the basis of `local` and its offset. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

// `-0` prints as `0` in JSON but fails a strict equality, so fold it away.
const whole = (n: number) => Math.trunc(n) || 0;

const COMPACT: Array<[keyof FriendlyRelative & string, string, Intl.RelativeTimeFormatUnit]> = [
  ["years", "y", "year"],
  ["months", "mo", "month"],
  ["weeks", "w", "week"],
  ["days", "d", "day"],
  ["hours", "h", "hour"],
  ["minutes", "m", "minute"],
];

function relative(epoch: number, now: Date, locale: string): FriendlyRelative {
  const ms = epoch - now.getTime();
  const seconds = ms / 1000;
  const days = seconds / 86_400;
  const units = {
    seconds: whole(seconds),
    minutes: whole(seconds / 60),
    hours: whole(seconds / 3600),
    days: whole(days),
    weeks: whole(days / 7),
    months: whole(days / 30.436875),
    years: whole(days / 365.2425),
  };
  const largest = COMPACT.find(([key]) => units[key as keyof typeof units] !== 0);
  const amount = largest ? units[largest[0] as keyof typeof units] : units.seconds;
  const display = largest
    ? amount > 0 ? `in ${amount}${largest[1]}` : `${-amount}${largest[1]} ago`
    : "now";
  const text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(amount, largest ? largest[2] : "second");
  return { display, text, isPast: ms < 0, ...units };
}

function friendlyDate(raw: string, epoch: number, timezone: string, locale: string, now: Date): FriendlyDate {
  const date = new Date(epoch);
  const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: timezone, ...opts }).format(date);
  const p = zonedParts(date, timezone);
  // The zone's offset is how far its wall clock sits from UTC at this instant.
  const offsetMinutes = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(epoch / 1000) * 1000) / 60_000);
  const offset = `${offsetMinutes < 0 ? "-" : "+"}${pad(Math.trunc(offsetMinutes / 60))}:${pad(offsetMinutes % 60)}`;
  const isoDate = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  const time24 = `${pad(p.hour)}:${pad(p.minute)}`;
  const timezoneName = new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? timezone;
  return {
    kind: "date",
    utc: date.toISOString(),
    local: `${isoDate}T${time24}:${pad(p.second)}.${pad(date.getUTCMilliseconds(), 3)}${offset}`,
    timezone,
    timezoneName,
    offset,
    epoch,
    short: fmt({ dateStyle: "short", timeStyle: "short" }),
    medium: fmt({ dateStyle: "medium", timeStyle: "short" }),
    long: fmt({ dateStyle: "long", timeStyle: "short" }),
    full: fmt({ dateStyle: "full", timeStyle: "short" }),
    dateShort: fmt({ dateStyle: "short" }),
    dateMedium: fmt({ dateStyle: "medium" }),
    dateLong: fmt({ dateStyle: "long" }),
    dateFull: fmt({ dateStyle: "full" }),
    time: fmt({ timeStyle: "short" }),
    time24,
    isoDate,
    year: p.year,
    month: p.month,
    monthName: fmt({ month: "long" }),
    monthShort: fmt({ month: "short" }),
    day: p.day,
    weekday: fmt({ weekday: "long" }),
    weekdayShort: fmt({ weekday: "short" }),
    hour: p.hour,
    minute: p.minute,
    relative: relative(epoch, now, locale),
    raw,
  };
}

/**
 * Recognise one value as a Cohost amount or a UTC timestamp and return its
 * friendly form; anything else (including non-strings) returns `null`.
 */
export function toFriendly(value: unknown, opts: FriendlyOptions = {}): Friendly | null {
  if (typeof value !== "string") return null;
  const locale = opts.locale || DEFAULT_LOCALE;
  const trimmed = value.trim();

  const amount = AMOUNT.exec(trimmed);
  if (amount) return friendlyCurrency(value, amount[1].toUpperCase(), Number(amount[2]), locale);

  if (TIMESTAMP.test(trimmed)) {
    const epoch = Date.parse(trimmed);
    if (!Number.isNaN(epoch)) {
      return friendlyDate(value, epoch, resolveTimezone(opts.timezone), locale, opts.now ?? new Date());
    }
  }
  return null;
}

const TIMEZONE_KEYS = new Set(["timezone", "timeZone", "tz"]);

/**
 * The first valid IANA zone held under a `timezone` / `timeZone` / `tz` key,
 * depth-first — an order's event zone sits at `meta.resolvedContext.location.timezone`,
 * an event's at `location.timezone`.
 */
export function findTimezone(data: unknown): string | undefined {
  if (Array.isArray(data)) {
    for (const item of data) {
      const tz = findTimezone(item);
      if (tz) return tz;
    }
    return undefined;
  }
  if (data === null || typeof data !== "object") return undefined;
  for (const [key, value] of Object.entries(data)) {
    if (TIMEZONE_KEYS.has(key) && isTimezone(value)) return value;
  }
  for (const value of Object.values(data)) {
    const tz = findTimezone(value);
    if (tz) return tz;
  }
  return undefined;
}

function walk(value: unknown, opts: FriendlyOptions): unknown {
  if (typeof value === "string") return toFriendly(value, opts) ?? value;
  if (Array.isArray(value)) return value.map((item) => walk(item, opts));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, walk(v, opts)]));
  }
  return value;
}

/**
 * Return a copy of `data` with every Cohost amount and UTC timestamp replaced by
 * its friendly form; everything else is copied unchanged. Times are shown in
 * `opts.timezone`, else the first zone found in the data, else UTC.
 */
export function friendlyData(data: unknown, opts: FriendlyOptions = {}): unknown {
  const timezone = resolveTimezone(opts.timezone || findTimezone(data));
  return walk(data, { ...opts, timezone, now: opts.now ?? new Date() });
}
