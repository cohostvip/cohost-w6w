/**
 * Content digests for change detection: `v1:` + the sha256 hex of a canonical
 * JSON of the chosen fields. Stamp one on a remote URN when importing (Sync
 * Object's Mapped URN Digest), recompute it on the next pass and compare with
 * Validate URN Digest — a different value means the remote object changed.
 *
 * Canonical = object keys sorted at every depth, `undefined` dropped (as
 * `JSON.stringify` does), so key order and absent-vs-undefined never change the
 * digest. A picked field that is missing counts as `null`, so a field that
 * appears or disappears does change it. The `v1:` prefix names this recipe;
 * a different recipe must use a new prefix so old digests simply mismatch.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** JSON with object keys sorted at every depth. */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    isPlainObject(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v,
  );

/** The value at a dot path (`costs.total`, `attendees.0.email`), or undefined. */
export const getPath = (data: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>(
    (node, key) => (node !== null && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
    data,
  );

/**
 * Normalize a field list: an array of dot paths, or a comma/newline-separated
 * string. Returns `undefined` for "no fields" (= digest the whole object).
 */
export const parseFields = (fields: unknown): string[] | undefined => {
  if (fields === undefined || fields === null || fields === "") return undefined;
  const list = typeof fields === "string" ? fields.split(/[,\n]/) : fields;
  if (!Array.isArray(list) || list.some((f) => typeof f !== "string")) {
    throw new Error('Fields must be a list of field paths, e.g. ["id", "status", "costs.gross"] or "id, status".');
  }
  const paths = [...new Set(list.map((f: string) => f.trim()).filter(Boolean))].sort();
  return paths.length > 0 ? paths : undefined;
};

/** The digested content: the picked fields (missing → null), or the whole object. */
export const digestContent = (data: unknown, fields?: string[]): unknown =>
  fields ? Object.fromEntries(fields.map((f) => [f, getPath(data, f) ?? null])) : data;

export const DIGEST_VERSION = "v1";

/** `v1:<sha256 hex>` of the canonical JSON of `data`'s picked fields (or all of it). */
export async function computeDigest(data: unknown, fields?: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(digestContent(data, fields)) ?? "null");
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${DIGEST_VERSION}:${hex}`;
}
