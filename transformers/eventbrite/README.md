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
│   ├── eventbrite-to-cohost.ts           # Resolve Eventbrite objects and collections → Cohost
│   └── cohost-to-eventbrite.ts           # Resolve Cohost objects and collections → Eventbrite
└── lib/
    ├── types.ts                          # partial shapes for both sides
    ├── currency.ts                       # "USD,1000" ⇄ { currency, value }
    ├── resolve.ts                        # structural detection, collections, expanded children
    ├── resolve-cohost.ts                 # reverse detection, collections, expanded children
    ├── events.ts                         # event mappers (both directions)
    ├── tickets.ts                        # ticket mappers
    └── orders.ts                         # order mappers
```

## Actions

One resolver per direction — both `type: "perform"`, `idempotent`,
`requiresAuth: false`:

| Action | In | Out |
| --- | --- | --- |
| **Eventbrite → Cohost** | Eventbrite event, ticket class, order, array, or API listing | Corresponding Cohost object or collection |
| **Cohost → Eventbrite** | Cohost event, ticket, order, array, or listing | Corresponding Eventbrite object or collection |
| **Eventbrite Resource URI → URN** | An Eventbrite `resource_uri`, a Company ID and a Connection ID | `{ urn, resourcePath }` — e.g. `…/v3/events/1/ticket_classes/2/` → `urn:1:<company>:<connection>:/events/1/ticket_classes/2`, the same URN Eventbrite → Cohost stamps |

Each action takes `data` as a JSON parameter and returns the mapped object or
collection. Imported objects are stamped with `source: "eventbrite"` and `sourceId`
(the upstream id) so downstream steps can dedupe and reconcile.

### Eventbrite resolver

Call `eventbrite-to-cohost` with `{ data: payload, companyId, connectionId, currency?: "USD" }`. The resolver
identifies object families by their fields, without requiring an object-type
parameter or relying on IDs or URLs:

| Input shape | Result |
| --- | --- |
| Event (`name.text`, `start`, or `end`) | `{ type: "event", urn, data }` — `data` is the Cohost event |
| Event expanded with `ticket_classes` | `{ type: "event", urn, data }` — mapped tickets stay inside it as `data.tickets` |
| Ticket class (`cost`, `free`, `donation`, `quantity_total`, or `on_sale_status`) | `{ type: "ticket", urn, data }` — `data` is the Cohost ticket |
| Order (`costs`, buyer fields, or `attendees` with `id`/`status`) | `{ type: "order", urn, data }` — `data` is the Cohost order; each attendee becomes one `items` entry |
| Array of supported inputs | Array of `{ type, urn, data }` results, in the same order |
| `{ events: [...], pagination }` | `{ events: [{ type, urn, data }, ...], pagination }` |
| `{ ticket_classes: [...], pagination }` | `{ tickets: [{ type, urn, data }, ...], pagination }` |
| `{ orders: [...], pagination }` | `{ orders: [{ type, urn, data }, ...], pagination }` |

Every converted object has the same envelope, so `.type` and `.urn` are always at the top level.
`urn` is also stamped on `data` (and on each nested ticket in `data.tickets`).
Tickets and orders also get `event_urn` — Eventbrite's `event_id` (or a nested ticket's
parent event) as the event's URN — so Cohost's Sync Object can resolve it to the synced
Cohost event (an order's context is built from it). `event_id` itself is not carried over.
With `event_id`, an order item's `offeringId` is its ticket class's URN
(`…/events/<id>/ticket_classes/<id>`), so Cohost matches it to the synced ticket; an
item that matches no ticket of the event fails the order instead of being dropped.

Pagination is optional and preserved when supplied. Listings also convert expanded
children. A ticket's own cost currency takes precedence; otherwise nested tickets
use the event currency, and standalone tickets use the optional `currency`
parameter (default `USD`). Missing or null event ticket expansions omit `tickets`;
an empty expansion becomes `tickets: []`.

The conversion function accepts `eventbriteToCohost(object, context, fallbackCurrency?)`.
Context identifies the owning company and the source connection, separately from the action runtime:

```json
{
  "companyId": "company_test_eventbrite",
  "connectionId": "conn_test_YYvhP6e7Irvfthu6"
}
```

Each converted event, ticket, and order receives a stable `urn` from the shared
`../../shared/urn.ts` generator, including objects inside listings and nested
tickets. The format is `urn:1:<companyId>:<connectionId>:<source-resource-path>`.
Source paths are `/events/<id>`, `/events/<event_id>/ticket_classes/<id>`, and
`/orders/<id>`. Source IDs are required; standalone tickets also require
`event_id`, while nested tickets can inherit it from their event. IDs are encoded
as individual path segments. Listing envelopes and order items do not receive
separate URNs (an item keeps the Eventbrite attendee id as its `id`).

Both IDs are required; the company ID never falls back to the app identifier. The
company ID above is synthetic; use the owning company's ID for real data.
Tests can use `createEventbriteContextFixture()` from
`tests/artficats/ebrite_context.ts` for a fresh context with a synthetic connection.

Unrecognized or ambiguous shapes fail with the location of the invalid input.
Standalone attendees and attendee listings are unsupported: supply their parent
order so they can become Cohost line items. The existing family mappers remain
available internally for conversions where the type is already known.

### Cohost resolver

Call `cohost-to-eventbrite` with `{ data: payload, currency?: "USD" }`.

| Input shape | Result |
| --- | --- |
| Event (string `start`, `end`, or `tz`) | Eventbrite **Create/Update Event** inputs |
| Event expanded with `tickets` | Event inputs with `ticketClasses` |
| Ticket (`price`, `priceCategory`, or `type: "admission"`) | Eventbrite **Create/Update Ticket Class** inputs |
| Order (`customer`, `items`, `orderNumber`, or string `costs.subtotal`) | Eventbrite order; items become `attendees` |
| Array of supported inputs | Array of mapped results, in the same order |
| `{ events: [...], pagination }` | `{ events: [...mappedEvents], pagination }` |
| `{ tickets: [...], pagination }` | `{ ticketClasses: [...mappedTickets], pagination }` |
| `{ orders: [...], pagination }` | `{ orders: [...mappedOrders], pagination }` |
| `{ results: [...], pagination }` | `{ results: [...mappedObjects], pagination }` |

The `results` envelope matches the Cohost connector's list actions and supports
empty or mixed collections. Pagination metadata is preserved without translating
its field names between APIs. Event and order currencies default to the optional
`currency` parameter (or `USD`); ticket amounts carry their own currency.
Missing or null ticket expansions are omitted; an empty expansion becomes
`ticketClasses: []`.

Events and tickets come out as the inputs of the Eventbrite app's write actions,
so each field binds straight onto Create Event / Update Event and Create Ticket
Class / Update Ticket Class:

- Event: `name`, `summary` (max 140 characters; falls back to the description's
  text, since Eventbrite treats summary and description as mutually exclusive),
  `startUtc`, `endUtc` (`YYYY-MM-DDThh:mm:ssZ`, no fractional seconds), `timezone`,
  `currency`, `capacity`, `listed` (from `public`).
- Ticket: `name`, `description`, exactly one of `free` / `donation` / `cost`
  (`"USD,4500"`, from `costs.cost`), `capacity`, `hidden`, `salesStart`,
  `salesEnd`, `minimumQuantity`, `maximumQuantity`.
- `eventId` / `ticketClassId` are set only for objects imported from Eventbrite
  (from the connection URN, or `refId` with source `eventbrite`): present →
  update, absent → create. Imported tickets also carry their `eventId`.
- Status, logo and other read-only fields are not included: publish with Publish
  Event, and set a logo through Upload Media + `logoId`.

Orders stay in Eventbrite's order shape: Eventbrite has no API to create orders.

Orders require `customer`, `costs`, and an `items` array. Each item requires its
costs. Standalone attendees and order items must be supplied inside their parent
order. Both resolvers reject unknown or ambiguous shapes rather than guessing.
Order round trips preserve mapped quantities and totals; each item maps back to
one attendee with its id.

### Migrating existing workflows

The former `eventbrite-event-to-cohost`, `eventbrite-ticket-to-cohost`, and
`eventbrite-order-to-cohost` action keys have been replaced by
`eventbrite-to-cohost`. Likewise, `cohost-event-to-eventbrite`,
`cohost-ticket-to-eventbrite`, and `cohost-order-to-eventbrite` have been replaced
by `cohost-to-eventbrite`. Rename the previous `event`, `ticketClass`, `ticket`,
or `order` input parameter to `data`.
Eventbrite-to-Cohost calls also require the source `companyId` and `connectionId` parameters.

```ts
import { eventbriteToCohost } from "./lib/resolve.ts";
import { cohostToEventbrite } from "./lib/resolve-cohost.ts";

const { type, urn, data } = eventbriteToCohost(eventbriteEvent, context); // ticket_classes → data.tickets, plus source URNs
const eventbriteResult = cohostToEventbrite(data); // tickets → ticket_classes; the whole envelope is accepted too
```

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
- **Tickets.** Cohost tickets take a `costs` object and `capacity` (not
  `price`/`quantity`), keep the ticket class id as `refId`, and get the category
  `General Admission`. Only Eventbrite's
  `cost` carries over — its `fee`/`tax` are Eventbrite's own charges — so
  `costs.gross` and `costs.total` equal `costs.cost`. `capacity` is Eventbrite's
  `capacity` (or `quantity_total`); `sales_start`/`sales_end` become
  `salesStart`/`salesEnd`.
- **Line items.** One Cohost order item per Eventbrite attendee, `id` = the
  attendee id (stable across re-syncs), `name` = the ticket class name. `cost`,
  `fee` and `tax` are per unit; `subtotal` (cost × qty), `gross` = `preDiscount`
  (cost + fee) × qty, and `total` (gross + tax) are line totals.

  This follows the original Eventbrite importer (`functions/ebrite`, removed
  2025-08).

These are partial projections — after identifying a supported shape, the mappers
use defaults for missing fields and ignore extra fields on the input,
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
