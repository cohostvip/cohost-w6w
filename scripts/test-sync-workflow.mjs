#!/usr/bin/env node
/**
 * End-to-end check of an Eventbrite → Cohost sync workflow on a LOCAL stack
 * (w6w server + cohost API): when the remote event is not imported yet, the first run
 * must CREATE the Cohost event (or UPDATE it when it is already mapped); every later run
 * sends the same payload, so it must come back UNCHANGED — the sync's digest early exit,
 * no write — with the current event as `data` (same id, same URN mappings). Read-only
 * apart from the workflow runs: it never deletes anything.
 *
 * The workflow is expected to end in the Cohost app's Sync Object step, fed by a
 * transformer whose output is the `{ type, urn, data }` envelope (e.g.
 * get_order → get_event → eventbrite_convert_event → sync_object).
 *
 * Steps:
 *   1. Find the remote event URN (from --event-urn, or the workflow's latest run) and
 *      whether it is already mapped to a Cohost event.
 *   2. Run the workflow --runs times and assert: run 1 → create if it was not mapped
 *      (update or unchanged for the mapped event if it was), runs 2.. → unchanged with
 *      the event as `data`, one Cohost event id throughout, and the event + every ticket
 *      mapped.
 *
 * Usage:
 *   node scripts/test-sync-workflow.mjs --token <w6w API token> [options]
 *
 * Options:
 *   --workflow <id>        workflow id (default wf_RVfNGjBUQ3sschM2)
 *   --runs <n>             workflow runs (default 2)
 *   --event-urn <urn>      the remote event URN (default: read from the latest run)
 *   --token <tsec_…>       w6w API token (or --token-file <path to {"token":…} or raw token>)
 *   --w6w <url>            w6w API base (default https://api-s2.w6w.dev)
 *   --cohost <url>         cohost API base (default https://cohost-s2.productivehub.com/api/v1)
 *   --cohost-token <jwt>   cohost bearer; default: sign in to the auth emulator
 *   --auth-emulator <url>  (default http://localhost:9039)
 *   --email / --password   emulator user (default jane@cohost.vip / password123)
 *
 * Exit code 0 when every assertion holds, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: opt } = parseArgs({
  options: {
    workflow: { type: "string", default: "wf_RVfNGjBUQ3sschM2" },
    runs: { type: "string", default: "2" },
    "event-urn": { type: "string" },
    token: { type: "string" },
    "token-file": { type: "string" },
    w6w: { type: "string", default: "https://api-s2.w6w.dev" },
    cohost: { type: "string", default: "https://cohost-s2.productivehub.com/api/v1" },
    "cohost-token": { type: "string" },
    "auth-emulator": { type: "string", default: "http://localhost:9039" },
    email: { type: "string", default: "jane@cohost.vip" },
    password: { type: "string", default: "password123" },
  },
});

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

const readToken = () => {
  if (opt.token) return opt.token;
  if (!opt["token-file"]) fail("Pass --token <w6w API token> or --token-file <path>.");
  const raw = readFileSync(opt["token-file"], "utf8").trim();
  try {
    return JSON.parse(raw).token;
  } catch {
    return raw;
  }
};

const w6wToken = readToken();
const runs = Number(opt.runs);
if (!Number.isInteger(runs) || runs < 1) fail("--runs must be a positive integer.");

async function call(base, token, path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const w6w = (path, init) => call(opt.w6w, w6wToken, path, init);

let cohostToken = opt["cohost-token"];
async function cohost(path, init) {
  if (!cohostToken) {
    const res = await fetch(
      `${opt["auth-emulator"]}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: opt.email, password: opt.password, returnSecureToken: true }),
      },
    );
    const body = await res.json();
    if (!body.idToken) fail(`Auth emulator sign-in failed: ${JSON.stringify(body)}`);
    cohostToken = body.idToken;
  }
  const body = await call(opt.cohost, cohostToken, path, init);
  return body?.data ?? body;
}

const isEnvelope = (v) =>
  v && typeof v === "object" && typeof v.type === "string" && typeof v.urn === "string" &&
  v.data && typeof v.data === "object";

/** The sync node (the Cohost app's sync-object step) and the transformer node, from a run. */
function nodesOf(run) {
  const nodes = Object.values(run.nodes ?? {});
  const sync = nodes.find((n) => n.meta?.action === "sync-object");
  const transformer = nodes.find((n) => n !== sync && isEnvelope(n.output));
  return { nodes, sync, transformer };
}

/** The Cohost (system) resource a remote URN is mapped to, or undefined. */
async function mappedCohost(urn) {
  try {
    const r = await cohost("/rms/urn/resolve", { method: "POST", body: JSON.stringify({ urn }) });
    return (r.resources ?? []).find((x) => x["-resource.@type"] === "system-resource");
  } catch (e) {
    if (e.status === 404) return undefined;
    throw e;
  }
}

/** The remote event URN plus its ticket URNs, from --event-urn or the latest run with a transformer output. */
async function remoteUrns() {
  const { runs: list = [] } = await w6w(`/workflows/${opt.workflow}/runs?limit=20`);
  for (const { runId } of list) {
    const { run } = await w6w(`/runs/${runId}`);
    const { transformer } = nodesOf(run);
    if (!transformer) continue;
    const { urn, data } = transformer.output;
    if (opt["event-urn"] && urn !== opt["event-urn"]) continue;
    return { eventUrn: urn, ticketUrns: (data.tickets ?? []).map((t) => t.urn).filter(Boolean) };
  }
  if (opt["event-urn"]) return { eventUrn: opt["event-urn"], ticketUrns: [] };
  fail("No earlier run with a transformer output to read the event URN from; pass --event-urn.");
}

async function runOnce(n) {
  const started = await w6w(`/workflows/${opt.workflow}/run?wait=true`, {
    method: "POST",
    body: JSON.stringify({ allowUnpublished: true }),
  });
  let { run } = await w6w(`/runs/${started.runId}`);
  for (let i = 0; i < 60 && !["succeeded", "failed", "cancelled"].includes(run.status); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    ({ run } = await w6w(`/runs/${started.runId}`));
  }
  const { nodes, sync } = nodesOf(run);
  console.log(`\n▸ run ${n}: ${run.runId} ${run.status}`);
  for (const node of nodes) {
    const app = node.meta ? ` ${node.meta.app}@${node.meta.version}` : "";
    const error = node.error ? ` — ${node.error.message ?? JSON.stringify(node.error)}` : "";
    console.log(`  ${node.status.padEnd(9)} ${node.nodeId}${app}${error}`);
  }
  if (!sync) fail(`run ${n}: no sync-object step in the run.`);
  if (sync.status !== "succeeded") fail(`run ${n}: ${sync.nodeId} ${sync.status}.`);
  const out = sync.output;
  console.log(`  → ${out.meta?.action} ${out.urn} changed=${JSON.stringify(out.meta?.changed ?? [])}`);
  return out;
}

const results = [];
const check = (ok, label) => {
  results.push({ ok, label });
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
};

const urns = await remoteUrns();
const before = await mappedCohost(urns.eventUrn);
console.log(`workflow ${opt.workflow}\nremote event ${urns.eventUrn} (${urns.ticketUrns.length} tickets)`);
console.log(before ? `already mapped to ${before["-resource.id"]} → expecting updates only` : "not mapped yet → expecting run 1 to create it");

const outputs = [];
for (let n = 1; n <= runs; n++) outputs.push(await runOnce(n));

console.log("\n▸ checks");
const first = outputs[0];
if (before) {
  check(
    ["update", "unchanged"].includes(first.meta?.action),
    `run 1 updated the mapped event, or skipped it as unchanged (got ${first.meta?.action})`,
  );
  check(first.id === before["-resource.id"], `run 1 wrote the mapped event ${before["-resource.id"]} (got ${first.id})`);
} else {
  check(first.meta?.action === "create", `run 1 created the event (got ${first.meta?.action})`);
}
outputs.slice(1).forEach((o, i) => {
  check(o.meta?.action === "unchanged", `run ${i + 2} exited early as unchanged (got ${o.meta?.action})`);
  check(o.data?.id === first.id, `run ${i + 2} returned the current event as data (data.id ${o.data?.id})`);
});
check(outputs.every((o) => o.id === first.id), `every run wrote the same event ${first.id}`);
check(first.mappedUrn === urns.eventUrn, `synced by the remote URN (mappedUrn ${first.mappedUrn})`);

const event = await mappedCohost(urns.eventUrn);
check(event?.["-resource.id"] === first.id, `remote event is mapped to ${first.id} (got ${event?.["-resource.id"]})`);
const tickets = await Promise.all(urns.ticketUrns.map(mappedCohost));
check(
  tickets.every((t) => t?.["-resource.path"]?.startsWith(`events/${first.id}/tickets/`)),
  `all ${tickets.length} tickets are mapped under events/${first.id}`,
);
const saved = await cohost(`/events/${first.id}`).catch((e) => ({ error: e.message }));
check(!saved.error && saved.id === first.id, `GET /events/${first.id} returns it${saved.error ? ` (${saved.error})` : ""}`);

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n✗ ${failed.length} of ${results.length} checks failed` : `\n✓ all ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
