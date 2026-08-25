# Eventbrite ⇄ Cohost Transformer (w6w)

A [w6w](https://github.com/w6w-io/w6w-core) **transformer** App: it maps
[Eventbrite](https://www.eventbrite.com/platform/api) objects to and from
[Cohost](https://cohost.vip) objects. Every action is a **pure, offline shape
conversion** — no auth, no network egress (`w6w.network.allow` is empty).

It's the glue for import/migration and two-way sync workflows: another App
*fetches* an object (the Eventbrite or Cohost App), a transform here reshapes it,
and another App *writes* it. Keeping the mapping in its own auth-less, network-less
App means the conversion logic is trivially testable and can never touch a
credential or the network.

## What's inside

```
eventbrite/
├── index.ts                              # AppDefinition: { actions } (no auth, no triggers)
├── actions/
│   ├── eventbrite-event-to-cohost.ts     # Eventbrite Event        → Cohost Event
│   ├── cohost-event-to-eventbrite.ts     # Cohost Event            → Eventbrite Event
│   ├── eventbrite-ticket-to-cohost.ts    # Eventbrite Ticket Class → Cohost Ticket
│   ├── cohost-ticket-to-eventbrite.ts    # Cohost Ticket           → Eventbrite Ticket Class
│   ├── eventbrite-order-to-cohost.ts     # Eventbrite Order        → Cohost Order
│   └── cohost-order-to-eventbrite.ts     # Cohost Order            → Eventbrite Order
└── lib/
    ├── types.ts                          # partial shapes for both sides
    ├── currency.ts                       # "USD,1000" ⇄ { currency, value }
    ├── events.ts                         # event mappers (both directions)
    ├── tickets.ts                        # ticket mappers
    └── orders.ts                         # order mappers
```

## Actions

Three object families, both directions — all `type: "perform"`, `idempotent`,
`requiresAuth: false`:

| Action | In | Out |
| --- | --- | --- |
| **Eventbrite → Cohost: Event** | Eventbrite [Event](https://www.eventbrite.com/platform/api#/reference/event) | Cohost Event |
| **Cohost → Eventbrite: Event** | Cohost Event | Eventbrite Event |
| **Eventbrite → Cohost: Ticket** | Eventbrite [Ticket Class](https://www.eventbrite.com/platform/api#/reference/ticket-class) | Cohost Ticket |
| **Cohost → Eventbrite: Ticket** | Cohost Ticket | Eventbrite Ticket Class |
| **Eventbrite → Cohost: Order** | Eventbrite [Order](https://www.eventbrite.com/platform/api#/reference/order) (expand `attendees`) | Cohost Order |
| **Cohost → Eventbrite: Order** | Cohost Order | Eventbrite Order |

Each action takes the source object as a single JSON param and returns the mapped
object. Imported objects are stamped with `source: "eventbrite"` and `sourceId`
(the upstream id) so downstream steps can dedupe and reconcile.

## Mapping notes

- **Status.** Events share the same lifecycle vocabulary
  (`draft/live/started/ended/completed/canceled`) and map 1:1; unknown inbound
  values fall back to `draft`, and Cohost-only statuses (`archived`, `queued`)
  collapse to the nearest Eventbrite one on the way out. Order status maps
  `placed`/`refunded` directly and `cancelled`/`deleted` → `voided`.
- **Money.** Cohost uses a single string `"USD,1000"` (currency + **minor units**);
  Eventbrite uses `{ currency, value, major_value, display }`. Minor units carry
  across unchanged, so conversions are lossless. See `lib/currency.ts`.
- **Order costs.** Eventbrite splits fees into `eventbrite_fee` + `payment_fee`;
  Cohost has a single `fee` (we sum in, and write the total back onto
  `eventbrite_fee` with `payment_fee = 0`). Cohost `gross` excludes tax and
  `total` includes it — both recomputed from components. Eventbrite exposes no
  order-level discount/delivery, so those are `0`.
- **Line items.** Eventbrite carries per-attendee rows; the order transform
  aggregates them by `ticket_class_id` into Cohost order items.

These are partial, forgiving projections — extra fields on the input are ignored,
and the authoritative schemas live in `@cohostvip/types` and the Eventbrite v3
API docs.

## Develop

```bash
npm install
npm run check   # tsc --noEmit
npm test        # vitest
```

No network egress and no credentials — the transforms are pure functions, unit
tested end to end in `tests/`.
