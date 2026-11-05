/**
 * Helpers for building Eventbrite write inputs (Create/Update Event, Ticket Class).
 */

/** ISO-8601 → `YYYY-MM-DDThh:mm:ssZ`, the only datetime form Eventbrite accepts on writes. */
export function ebDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`invalid datetime: ${JSON.stringify(value)}`);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * The Eventbrite id under `segment` in a connection URN
 * (`urn:1:<company>:<connection>:/events/<id>[/ticket_classes/<id>]`); Cohost URNs have none.
 */
export function idFromUrn(urn: unknown, segment: "events" | "ticket_classes"): string | undefined {
  if (typeof urn !== "string") return undefined;
  const [, , , service = "", path = ""] = urn.split(":");
  const match = new RegExp(`/${segment}/([^/]+)`).exec(path);
  return match && !service.startsWith("cohost") ? decodeURIComponent(match[1]) : undefined;
}

/** The upstream id of an object imported from Eventbrite; Cohost-native objects have none. */
export function importedId(value: { source?: unknown; sourceId?: unknown; refId?: unknown }): string | undefined {
  const fromEventbrite = value.source === undefined || value.source === "eventbrite";
  const id = value.refId ?? value.sourceId;
  return fromEventbrite && typeof id === "string" && id ? id : undefined;
}
