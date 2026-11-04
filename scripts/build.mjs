#!/usr/bin/env node
/**
 * Build every app in w6w-pack.json with the w6w CLI (`w6w build app`), into:
 *
 *   <out>/index.json                                  id, version and digest per app
 *   <out>/<app-id>/<version>/{manifest.json, app.js}
 *
 * Usage:
 *
 *   node scripts/build.mjs [--out dist] [--cli <path to w6w.js>]
 *
 * `w6w build app` runs each app's `npm run test` then `npm run build` (which
 * bundles to package.json `main`), so run `npm install` in each app first.
 * The CLI is `--cli` / `W6W_CLI` (a w6w.js run with node), else `w6w` on PATH.
 *
 * `COHOST_API_URL` (optional, local builds only) points the Cohost app at another
 * Cohost API: its bundle bakes the URL in (cohost/scripts/bundle.mjs) and this
 * script adds the URL's host to the built manifest's network allowlist. Unset,
 * the build targets production (api.cohost.vip).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(2);
}

let out = join(ROOT, "dist");
let cli = process.env.W6W_CLI;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-o" || argv[i] === "--out") out = resolve(argv[++i]);
  else if (argv[i] === "--cli") cli = argv[++i];
  else if (argv[i] === "-h" || argv[i] === "--help") {
    console.log("usage: node scripts/build.mjs [--out dist] [--cli <path to w6w.js>]");
    process.exit(0);
  } else fail(`unknown argument: ${argv[i]}`);
}

const apiUrl = process.env.COHOST_API_URL?.trim();
let apiHost;
if (apiUrl) {
  try {
    apiHost = new URL(apiUrl).hostname;
  } catch {
    fail(`COHOST_API_URL is not a URL: ${apiUrl}`);
  }
}

const [cmd, prefix] = cli ? [process.execPath, [resolve(cli)]] : ["w6w", []];
const pack = JSON.parse(readFileSync(join(ROOT, "w6w-pack.json"), "utf8"));

for (const { path } of pack.apps) {
  const appDir = resolve(ROOT, path);
  const pkg = JSON.parse(readFileSync(join(appDir, "package.json"), "utf8"));
  const args = [
    ...prefix, "build", "app", appDir,
    "--out", join(out, pkg.w6w.id, pkg.version),
    "--pack", join(out, "index.json"),
  ];
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.error) fail(`could not run ${cmd}: ${r.error.message}`);
  if (r.status !== 0) process.exit(r.status ?? 1);

  // A local Cohost API needs its host in the allowlist beside api.cohost.vip.
  // The pack digest covers app.js only, so editing manifest.json leaves it valid.
  if (apiHost && pkg.w6w.network?.allow?.includes("api.cohost.vip")) {
    const manifestPath = join(out, pkg.w6w.id, pkg.version, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const allow = manifest.app.network.allow;
    if (!allow.includes(apiHost)) allow.push(apiHost);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}
