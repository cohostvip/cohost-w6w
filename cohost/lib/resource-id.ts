/** Extract a resource ID from a Cohost URN; plain IDs are already API-ready. */
export function resourceId(value: string, collection: string): string {
  if (!value.startsWith("urn:")) return value;

  const invalid = () => new Error(`Expected a ${collection} resource URN ending in /${collection}/<id>.`);
  const match = /^urn:1:[^:\s/]+:[^:\s/]+:(\/[^?#\s]+)$/.exec(value);
  if (!match) throw invalid();
  let segments: string[];
  try {
    segments = match[1].slice(1).split("/").map(decodeURIComponent);
  } catch {
    throw invalid();
  }
  if (segments.length % 2 !== 0 ||
      segments.some(segment => !segment || segment === "." || segment === ".." || /[/\\\u0000-\u001f]/.test(segment)) ||
      segments.at(-2) !== collection) {
    throw invalid();
  }
  return segments.at(-1)!;
}
