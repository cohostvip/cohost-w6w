/**
 * Event mappers: Eventbrite Event ⇄ Cohost Event.
 *
 * Eventbrite and Cohost happen to share the same lifecycle vocabulary
 * (draft/live/started/ended/completed/canceled), so status maps 1:1; unknown
 * inbound values fall back to `draft`. Times: Eventbrite carries a datetime
 * triple per endpoint (`start.utc` + `start.timezone`); Cohost stores a single
 * ISO instant plus a separate `tz`.
 */
import { ebDateTime, idFromUrn, importedId } from "./outbound.ts";
import type { CohostEvent, CohostEventStatus, EbEvent, EbEventInput } from "./types.ts";

const SOURCE = "eventbrite";
/** Eventbrite's limit on an event summary. */
const SUMMARY_MAX = 140;

const EB_TO_COHOST_STATUS: Record<string, CohostEventStatus> = {
  draft: "draft",
  live: "live",
  started: "started",
  ended: "ended",
  completed: "completed",
  canceled: "canceled",
};

export function eventbriteEventToCohost(eb: EbEvent): CohostEvent {
  const start = eb.start?.utc ?? eb.start?.local ?? "";
  const end = eb.end?.utc ?? eb.end?.local ?? "";
  const tz = eb.start?.timezone ?? eb.end?.timezone ?? "UTC";
  const name = eb.name?.text?.trim() || "Untitled event";
  const summary = eb.summary?.trim() || eb.name?.text?.trim() || name;
  const logoUrl = eb.logo?.original?.url ?? eb.logo?.url;

  return {
    name,
    summary,
    description: eb.description?.html ?? eb.description?.text ?? null,
    tz,
    start,
    end,
    status: EB_TO_COHOST_STATUS[eb.status ?? ""] ?? "draft",
    currency: (eb.currency ?? "USD").toUpperCase(),
    flyer: logoUrl
      ? {
          url: logoUrl,
          width: eb.logo?.original?.width,
          height: eb.logo?.original?.height,
        }
      : null,
    capacity: eb.capacity ?? null,
    source: SOURCE,
    sourceId: eb.id,
  };
}

/**
 * Cohost event → the Eventbrite app's Create/Update Event inputs. `eventId` is set
 * only for an event imported from Eventbrite, so its presence picks update over create.
 * Eventbrite treats `summary` and the deprecated `description` as mutually exclusive,
 * so only the summary is sent (falling back to the description's text).
 */
export function cohostEventToEventbrite(ev: CohostEvent): EbEventInput {
  const summary = (ev.summary?.trim() || descriptionText(ev.description)).slice(0, SUMMARY_MAX).trim();
  const eventId = idFromUrn(ev.urn, "events") ?? importedId(ev);
  return {
    ...(eventId ? { eventId } : {}),
    name: ev.name,
    ...(summary ? { summary } : {}),
    ...(ev.start ? { startUtc: ebDateTime(ev.start) } : {}),
    ...(ev.end ? { endUtc: ebDateTime(ev.end) } : {}),
    ...(ev.tz ? { timezone: ev.tz } : {}),
    currency: ev.currency.toUpperCase(),
    ...(typeof ev.capacity === "number" ? { capacity: ev.capacity } : {}),
    ...(typeof ev.public === "boolean" ? { listed: ev.public } : {}),
  };
}

/** Plain text of a description given as an HTML string or Cohost multipart text. */
function descriptionText(description: CohostEvent["description"]): string {
  if (!description) return "";
  if (typeof description === "string") return stripHtml(description);
  if (typeof description.text === "string") return description.text.trim();
  if (typeof description.html === "string") return stripHtml(description.html);
  return typeof description.md === "string" ? description.md.trim() : "";
}

/** Very small HTML→text fallback. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
