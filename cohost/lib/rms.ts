import type { HookContext } from "@w6w/types";
import { isCohostNotFound } from "./channel-event.ts";
import { CohostClient } from "./client.ts";

/** One mapped resource, as `/rms/urn/search` returns it. */
export type MappedResource = { urn: string; labels: Record<string, unknown>; meta: { implementation?: unknown } };

/** URNs per `POST /rms/urn/search` (the API takes up to 250). */
export const SEARCH_BATCH = 200;
/** Single-URN searches in flight at once when the batch endpoint is unavailable. */
export const FALLBACK_CONCURRENCY = 8;

/**
 * The mapped resources of many URNs, `{ [urn]: results }` with every URN present (`[]` when
 * unmapped). `labels` must all match on the counterpart, as in `find-mapped-resources`.
 *
 * One `POST /rms/urn/search` per {@link SEARCH_BATCH} URNs, all in parallel. A Cohost without that
 * endpoint answers 404; then each URN goes through the single-URN `GET /rms/urn/search`,
 * {@link FALLBACK_CONCURRENCY} at a time.
 */
export async function searchMappedResources(
  ctx: HookContext,
  urns: readonly string[],
  labels?: Record<string, unknown>,
): Promise<Record<string, MappedResource[]>> {
  const unique = [...new Set(urns)];
  if (!unique.length) return {};
  const client = new CohostClient(ctx);
  const found: Record<string, unknown> = {};

  try {
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += SEARCH_BATCH) chunks.push(unique.slice(i, i + SEARCH_BATCH));
    const parts = await Promise.all(chunks.map(chunk =>
      client.request<Record<string, unknown>>("/rms/urn/search", { method: "POST", body: { urns: chunk, labels } })
    ));
    for (const part of parts) Object.assign(found, part ?? {});
  } catch (error) {
    if (!isCohostNotFound(error)) throw error;
    ctx.log("warn", "batch URN search unavailable; searching one URN at a time", { urns: unique.length });
    let next = 0;
    const worker = async () => {
      while (next < unique.length) {
        const urn = unique[next++];
        found[urn] = await client.request<unknown>("/rms/urn/search", {
          query: { urn, labels: labels === undefined ? undefined : JSON.stringify(labels) },
        });
      }
    };
    await Promise.all(Array.from({ length: Math.min(FALLBACK_CONCURRENCY, unique.length) }, worker));
  }

  return Object.fromEntries(unique.map(urn => [urn, Array.isArray(found[urn]) ? found[urn] as MappedResource[] : []]));
}
