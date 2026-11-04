/**
 * An Eventbrite API `resource_uri` → the canonical resource path URNs are built from.
 *
 * `https://www.eventbriteapi.com/v3/events/1/ticket_classes/2/` → `/events/1/ticket_classes/2`,
 * the same path `eventbriteToCohost` stamps on the object it converts.
 */
export function resourcePathFromUri(resourceUri: string): string {
  let url: URL;
  try {
    url = new URL(resourceUri.trim());
  } catch {
    throw new TypeError(`resourceUri: Expected an Eventbrite API URL, got ${JSON.stringify(resourceUri)}.`);
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "v3") segments.shift();
  if (segments.length === 0 || segments.length % 2 !== 0) {
    throw new TypeError(`resourceUri: Expected /<collection>/<id> pairs after /v3, got ${JSON.stringify(url.pathname)}.`);
  }
  // Re-encode each segment once, as the converter does with source IDs.
  return "/" + segments.map((s) => encodeURIComponent(decodeURIComponent(s))).join("/");
}
