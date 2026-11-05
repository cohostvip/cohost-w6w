#!/usr/bin/env node
/**
 * Bundle the app to dist/app.js (what `npm run build` and `w6w build app` run).
 *
 * The Cohost API base defaults to production. Set `COHOST_API_URL` to bake in
 * another one for a local build, e.g.
 *
 *   COHOST_API_URL=https://cohost-s2.productivehub.com/api/v1 npm run build
 */
import { build } from "esbuild";

const apiUrl = process.env.COHOST_API_URL?.trim();

await build({
  entryPoints: ["index.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile: "dist/app.js",
  define: apiUrl ? { __COHOST_API_URL__: JSON.stringify(apiUrl) } : {},
});

console.log(`bundled dist/app.js — Cohost API: ${apiUrl || "https://api.cohost.vip/v1 (production)"}`);
