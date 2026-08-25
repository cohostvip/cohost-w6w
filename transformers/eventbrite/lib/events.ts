/**
 * Event mappers: Eventbrite Event ⇄ Cohost Event.
 *
 * Eventbrite and Cohost happen to share the same lifecycle vocabulary
 * (draft/live/started/ended/completed/canceled), so status maps 1:1; unknown
 * inbound values fall back to `draft`. Times: Eventbrite carries a datetime
 * triple per endpoint (`start.utc` + `start.timezone`); Cohost stores a single
 * ISO instant plus a separate `tz`.
 */
import type { CohostEvent, CohostEventStatus, EbEvent } from "./types.ts";

const SOURCE = "eventbrite";

const EB_TO_COHOST_STATUS: Record<string, CohostEventStatus> = {
  draft: "draft",
  live: "live",
  started: "started",
  ended: "ended",
  completed: "completed",
  canceled: "canceled",
};

// Cohost statuses without an Eventbrite equivalent collapse to the nearest one.
const COHOST_TO_EB_STATUS: Record<CohostEventStatus, string> = {
  archived: "ended",
  queued: "draft",
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

export function cohostEventToEventbrite(ev: CohostEvent): EbEvent {
  return {
    id: ev.sourceId,
    name: { text: ev.name, html: ev.name },
    summary: ev.summary,
    description: { html: ev.description ?? "", text: stripHtml(ev.description ?? "") },
    start: { timezone: ev.tz, utc: ev.start },
    end: { timezone: ev.tz, utc: ev.end },
    currency: ev.currency.toUpperCase(),
    status: COHOST_TO_EB_STATUS[ev.status] ?? "draft",
    capacity: ev.capacity ?? null,
    logo: ev.flyer?.url ? { url: ev.flyer.url, original: { url: ev.flyer.url } } : null,
  };
}

/** Very small HTML→text fallback for the `description.text` field. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
