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

## Develop

Each app manages its own dependencies and test suite:

```bash
cd cohost && npm install && npm run check && npm test
cd transformers/eventbrite && npm install && npm run check && npm test
```

## License

MIT — see [`LICENSE`](./LICENSE).
