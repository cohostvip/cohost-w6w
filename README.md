# cohost-w6w

A [w6w](https://w6w.io) **app pack** for [Cohost](https://cohost.vip).

> **Status:** Development · **License:** MIT · **Spec:** `PackManifest v1`

## Contents

`w6w-pack.json` at the repo root lists every app bundled here. Register the
whole pack in one call, or install a single app by pointing at its
subdirectory (`github:cohostvip/cohost-w6w@main#cohost`,
`file:./cohost`, …).

| App | Path | What it does |
| --- | --- | --- |
| **Cohost** | [`./cohost`](./cohost) | Orders, events, tickets, checkout, coupons, organizers, users — a 1:1 mirror of the public [`@cohostvip/cohost-node`](https://www.npmjs.com/package/@cohostvip/cohost-node) SDK, plus triggers for `order.placed` / `order.changed` / `order.confirmation-requested`. |
| **Eventbrite ⇄ Cohost** | [`./transformers/eventbrite`](./transformers/eventbrite) | Bidirectional format transformers between Cohost's and Eventbrite's event/ticket/order shapes — no network calls of its own, pure data mapping for workflows that bridge the two platforms. |

Each app dir is a standalone w6w App: `package.json` (manifest under the `w6w`
field), `index.ts` (default export of an `AppDefinition`), `actions/`,
`auth/`, `assets/icon.svg`, and its own `tsconfig.json` / `tests/`.

`shared/` holds dependency-free TypeScript utilities reused by apps and file
builders. `shared/context.ts` defines the source company + connection context, and
`shared/urn.ts` generates stable company/connection-scoped URNs before upload:

```ts
import { generateUrn } from "./shared/urn.ts";

generateUrn("/events/1000000000001", {
  companyId: "company_test_eventbrite",
  connectionId: "conn_test_example",
});
// urn:1:company_test_eventbrite:conn_test_example:/events/1000000000001
```

The company ID identifies the resource owner and the connection ID its source;
both are required. The company ID in this example is synthetic; supply the owning
company's ID for real data.

## Develop

Each app manages its own dependencies and test suite:

```bash
cd cohost && npm install && npm run check && npm test
cd transformers/eventbrite && npm install && npm run check && npm test
```

## Build

Each app's `npm run build` bundles `index.ts` into a single ESM file at its `main`
(`dist/app.js`). `scripts/build.mjs` runs `w6w build app` (test → build → describe) on every app
in `w6w-pack.json`:

```bash
node scripts/build.mjs -o out     # → out/index.json + out/<app-id>/<version>/{manifest.json,app.js}
node scripts/build.mjs --cli ../w6w/packages/wrappers/cli/dist/bin/w6w.js -o out
```

The CLI is `--cli` / `W6W_CLI`, else `w6w` on `PATH`. Run `npm install` in each app first.

## License

MIT — see [`LICENSE`](./LICENSE).
