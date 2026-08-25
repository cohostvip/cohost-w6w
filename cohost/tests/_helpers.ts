/**
 * Test helper: build a mock `HookContext` for unit-testing actions and auth hooks.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { id: "ord_1" } }]);
 *   const result = await action.execute({ order: "ord_1" }, ctx);
 *   expect(new URL(calls[0].url).pathname).toBe("/v1/orders/ord_1");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response; if
 * the queue is empty the test fails loudly (so a test that makes an unexpected
 * extra request surfaces the bug rather than hanging).
 *
 * Some trigger `handleIngest` hooks are pure passthrough (no network I/O —
 * test them directly, no ctx); the order triggers enrich a webhook ping into
 * the full entity via `ctx.fetch`, so they need this mock too.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body (e.g. 204). String → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  rawBody: BodyInit | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = []): MockCtx {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    const rawHeaders = init?.headers;
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k.toLowerCase()] = String(v);
    } else if (rawHeaders && typeof rawHeaders === "object") {
      for (const [k, v] of Object.entries(rawHeaders)) headers[k.toLowerCase()] = String(v);
    }
    const rawBody = (init?.body ?? null) as BodyInit | null;
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : init.body instanceof FormData
      ? "[FormData]"
      : String(init.body);

    calls.push({ url, method, headers, body, rawBody });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const status = next.status ?? 200;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}
