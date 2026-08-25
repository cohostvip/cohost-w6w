import type { HookContext } from "@w6w/types";

/** Cohost API base (versioned). */
export const API_URL = "https://api.cohost.vip/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Unwrap the Cohost API response envelope, mirroring `@cohostvip/cohost-node`'s
 * `src/http/request.ts` exactly so actions return the same shapes the SDK does:
 *
 *   { status: 'ok', data, pagination } → { results: data, pagination }
 *   { status: 'ok', data }             → data
 *   anything else                      → verbatim
 */
function unwrapEnvelope(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return body;
  const env = body as Record<string, unknown>;
  if (env.status !== "ok" || !("data" in env)) return body;
  if ("pagination" in env) return { results: env.data, pagination: env.pagination };
  return env.data;
}

/**
 * Thin wrapper over `ctx.fetch`. The `Authorization: Bearer …` header is injected
 * by the auth definition's `sign` hook — never set it here. All egress goes to
 * `api.cohost.vip`, declared in `w6w.network.allow`.
 */
export class CohostClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Cohost ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (text === "") return undefined as T;
    return unwrapEnvelope(JSON.parse(text)) as T;
  }
}
