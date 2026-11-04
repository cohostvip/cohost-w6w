# Cohost w6w App

A [w6w](https://github.com/w6w-io/w6w-core) App for [Cohost](https://cohost.vip). It
exposes Cohost order **events** as triggers and Cohost's **backend-ops** API as
**actions**, so workflows can both react to and drive Cohost on the w6w runtime.

The action set mirrors the backend-ops slice of the endpoints published by the
[`@cohostvip/cohost-node`](https://www.npmjs.com/package/@cohostvip/cohost-node) SDK —
28 endpoints across events, tickets, orders, coupons, organizers and users. When a
backend-ops endpoint is added to that SDK, add an action here.

Cart-session/checkout endpoints (`start-cart-session`, `update-cart-item`,
`apply-cart-coupon`, `process-cart-payment`, `place-cart-order`, etc.) are
deliberately **not** actions here — they exist to drive a live checkout from the
Node/React SDK in the browser, one HTTP round-trip per user keystroke, not
something a backend workflow orchestrates. w6w is for backend ops.

It replaces the two legacy runtime-server workflows:

| Legacy workflow | w6w wiring |
| --- | --- |
| **Send confirmation email** | Subscribe a workflow to the **Order Confirmation Requested** trigger → send. |
| **Sync updates to jb** | Subscribe a workflow to the **Order Placed** / **Order Changed** trigger → an outbound HTTP step. |

## What's inside

```
cohost/
├── index.ts                              # AppDefinition: { actions, triggers, auth }
├── auth/api-token.ts                     # Cohost API token (bearer); sign + test
├── actions/                              # one file per endpoint, one action per endpoint (+ friendly-*)
├── triggers/
│   ├── order-placed.ts                   # fires on `order.placed`
│   ├── order-changed.ts                  # fires on `order.changed`
│   ├── order-confirmation-requested.ts   # fires on `order.confirmation-requested`
│   ├── event-changed.ts                  # fires on `event.*`
│   ├── ticket-changed.ts                 # fires on `offering.*`
│   └── object-changed.ts                 # general: any picked type × action
└── lib/
    ├── client.ts            # thin ctx.fetch wrapper over api.cohost.vip
    ├── params.ts            # shared param / output fragments (pagination, resources)
    ├── outputs.ts           # trigger payload shapes: declared output + sample
    ├── types.ts             # minimal structural types for the resources
    ├── notification.ts      # webhook ping → {urn, type, action, …}; shared subscribe/unsubscribe
    ├── friendly.ts          # amounts + UTC timestamps → display-ready fields
    ├── friendly-output.ts   # the `friendly` flag on every fetch action
    └── w6w-triggers.ts      # forward-compat shim: trigger types not yet in @w6w/types
```

## Triggers

- **Order Placed** — fires on `order.placed`.
- **Order Changed** — fires on `order.changed`.
- **Order Confirmation Requested** — fires on `order.confirmation-requested`, the
  narrower signal Cohost's own messaging layer emits when a confirmation email is
  actually due (not every placed order needs one).
- **Event Changed** — fires on `event.created` / `updated` / `deleted` / `published`
  (pick which; created, updated and deleted by default). Sends the change plus the
  current event (`null` once deleted).
- **Ticket Changed** — fires on `offering.created` / `updated` / `deleted` (tickets
  are offerings on the platform). Sends the change plus the current ticket (`null`
  once deleted).
- **Object Changed** — the general trigger. Pick the types (event, ticket/offering,
  order, attendee) and actions (created, updated, deleted by default; also published,
  placed, refunded, checked in); it subscribes to every combination Cohost emits.
  Sends only the change — fetch the object with the matching `get-*` action.

The three change triggers send `{ urn, type, action, webhookEvent, id, eventId?,
resourcePath, companyId, changedFields, timestamp }`, e.g. `type: "offering"`,
`action: "updated"`. `changedFields` lists each changed top-level key plus every changed
dotted path under it — a tax change gives `["costs", "costs.tax", "costs.total"]`; arrays
are listed whole. It names fields only: the old values are not sent. `*.changed` events are never subscribed: Cohost fires one with
every `*.updated`, so they would deliver each update twice.

Each trigger's `onSubscribe`/`onUnsubscribe` register/deregister a real Cohost
webhook (`POST`/`DELETE /v1/webhooks`) against the `callbackUrl` the runtime hands
it. `handleIngest` does **not** pass the delivered webhook ping straight through —
Cohost's webhook payload is a notification (`{id, action, urn, context,
changedFields?}`), never the entity itself — so the order triggers fetch the full
order via `GET /orders/{id}` before handing it to the workflow. The order triggers
therefore send that endpoint's `{ order, organizer, transaction, transactions }` — read
fields as `order.customer.email`, `order.costs.total`, `order.items`.

Every trigger declares its payload as `output` plus a synthetic `sample`
(`lib/outputs.ts`), so the editor offers its fields before the trigger first fires.
`tests/lib/outputs.test.ts` keeps each sample in step with its `output`.

## Actions

### Events (`resource: event`)

| Key | Endpoint |
| --- | --- |
| `list-events` | `GET /events` |
| `get-event` | `GET /events/{id}` |
| `search-events` | `GET /events/search` |
| `create-event` | `POST /events` |
| `update-event` | `PATCH /events/{id}` |
| `get-event-blocks` | `GET /events/{id}/blocks` |
| `list-event-attendees` | `GET /events/{id}/attendees` |

### Tickets (`resource: ticket`)

| Key | Endpoint |
| --- | --- |
| `list-event-tickets` | `GET /events/{id}/tickets` |
| `get-event-ticket` | `GET /events/{id}/tickets/{ticketId}` |
| `create-event-tickets` | `POST /events/{id}/tickets` |
| `update-event-ticket` | `PATCH /events/{id}/tickets/{ticketId}` |
| `delete-event-ticket` | `DELETE /events/{id}/tickets/{ticketId}` |

### Orders (`resource: order`)

| Key | Endpoint |
| --- | --- |
| `list-orders` | `GET /orders` |
| `get-order` | `GET /orders/{id}` |
| `list-order-attendees` | `GET /orders/{id}/attendees` |
| `send-order-confirmation` | `POST /orders/{id}/send-confirmation` |

### Coupons (`resource: coupon`)

| Key | Endpoint |
| --- | --- |
| `list-coupons` | `GET /coupons` |
| `create-coupon` | `POST /coupons` |
| `update-coupon` | `PATCH /coupons/{id}` |
| `delete-coupon` | `DELETE /coupons/{id}` |

Reads are list-only — the API has no `GET /coupons/{id}`.

### Organizers (`resource: organizer`)

| Key | Endpoint |
| --- | --- |
| `list-organizers` | `GET /organizers` |
| `get-organizer` | `GET /organizers/{id}` |
| `create-organizer` | `POST /organizers` |
| `update-organizer` | `PATCH /organizers/{id}` |
| `delete-organizer` | `DELETE /organizers/{id}` |

### Users (`resource: user`)

| Key | Endpoint |
| --- | --- |
| `get-me` | `GET /me` |
| `get-user` | `GET /users/{id}` |
| `list-users` | `GET /users` |

Both user-profile reads select the channel with an `x-cohost-channel-id` header, and
`list-users` paginates with `limit`/`offset` rather than `page`/`size`.

### URN mappings (`resource: urn`)

After creating an external resource, use **Register URN Mapping**
(`register-urn-mapping`) with the existing **Cohost URN**, the **Mapped Resource URN**
(for example, the new Eventbrite event URN), and optional JSON **Labels**.
Both URNs must belong to the same company. Labels are merged onto the mapped
resource, where `find-mapped-resources` can filter them. Repeating the same pair
updates its labels without duplicating the mapping. No sync labels or policies
are assumed by default; registering a mapping does not itself synchronize data.

`find-mapped-resources` calls `GET /rms/urn/search` with a source URN and optional
**Labels** JSON object. It returns `{ results: [{ urn, labels, meta }] }` for other
resources in the same mapping, using each counterpart's registry labels. The
source itself (including its Falcon/Puma alias) is excluded and results are
deduplicated. Lookups work from either endpoint.

**Sync Object** (`sync-object`) upserts an event, ticket or order in one step —
no router needed. It calls `POST /rms/sync` with the object as **Data**, its
**Type** (`event`/`ticket`/`order`), and at least one identity:

```json
{
  "type": "event",
  "data": { "name": "…" },
  "urn": "urn:1:<company>:cohost-falcon:/events/<id>",
  "mappedUrn": { "urn": "urn:1:<company>:conn_…:/events/<remote-id>", "labels": { "source": "eventbrite" } }
}
```

`urn` is our Cohost URN and updates that object. `mappedUrn.urn` is the remote
URN: the object it is mapped to is updated, or the object is inserted and the
mapping recorded. Its `labels` are merged onto the mapping, the same way Register
URN Mapping stores them. A ticket's Cohost event comes from **Event ID**, from its
URN, from `data.event_urn`, or from the mapping of the remote URN's parent event, so
sync the event first. An order's `data.event_urn` (our event URN, or a remote one the
event was synced from) names its event; the order's context (`evt_<id>`, organizer)
is built from it. An event's `data.tickets` are saved with the event.
It returns `{ type, urn, mappedUrn, id, data, meta }`: our URN, the saved object,
and `meta.action` (`create`/`update`) with the changed fields.

For example, `{"purpose":"sync"}` matches a mapped resource whose labels include
`{"source":"eventbrite","purpose":"sync","category":"ticket"}`. Multiple filter
keys use AND; extra stored labels are allowed. Arrays use containment, so
`{"capabilities":["sync_upstream"]}` also matches resources with additional
capabilities. Labels filter counterpart resources, not the source or dependency
records. The API query encodes the filter as a JSON string in `labels`.

`resolve-urn` retains its separate mapping-document resolution contract.

### Formatting (`resource: format`)

Local conversions — no API call, no connection needed. They exist because
`@w6w/template` is plain Handlebars, without Cohost's `chCurrency` / `chDate` helpers.

| Key | What it does |
| --- | --- |
| `friendly-value` | One value: a Cohost amount (`"USD,5500"`) or a UTC timestamp → its friendly form (`{ kind: "unknown" }` for anything else). |
| `friendly-data` | Any object (order, event, ticket, a list): every amount and UTC timestamp replaced by its friendly form, everything else unchanged. |

An amount becomes `{ kind: "currency", value: 5500, major: 55, display: "$55",
displayPadded: "$55.00", displayCode: "55.00 USD", currency, symbol, decimals, isZero,
isNegative, raw }`. A timestamp becomes `{ kind: "date", utc, local, timezone,
timezoneName, offset, epoch, short, medium, long, full, dateShort … dateFull, time,
time24, isoDate, year, month, monthName, day, weekday, hour, minute, relative, raw }`,
where `relative` is `{ display: "in 7mo" | "2w ago", text, isPast, seconds, minutes,
hours, days, weeks, months, years }` (signed whole units from now). Bare dates such as
`version: "2025-12-15"` are left alone.

Local fields use the `timezone` param, else (for `friendly-data`) the first IANA zone
found under a `timezone` / `timeZone` / `tz` key in the data — an order's event zone —
else UTC. `locale` (default `en-US`) shapes every display string.

Every fetch action (`get-*`, `list-*`, `search-events`) also has a **Friendly Format**
checkbox, unchecked by default. Checked, the action returns its result already through
`friendly-data` — so a template reads `{{order.costs.total.display}}` or
`{{#unless order.costs.fee.isZero}}` straight off a `get-order` step.

## Response shapes

`lib/client.ts` mirrors the SDK's envelope handling, so an action sees what the SDK
returns rather than the raw wire body:

- `{ status: 'ok', data, pagination }` → `{ results, pagination }`
- `{ status: 'ok', data }` → `data`
- anything else → verbatim

Two app-level conventions sit on top of that, so every action's `output` is
addressable by key:

- endpoints that answer with a **bare array** (`list-event-tickets`,
  `list-order-attendees`, `list-coupons`) are wrapped as `{ results }`;
  `list-organizers` re-keys the API's `{ organizers }` to `{ results }` for the same reason.
- `DELETE` endpoints, which return no content, report `{ deleted: true, id }`.

Body wrapping is **not** uniform across the API and the actions follow it faithfully:
events wrap (`{ event }`, `{ ticket }` / `{ tickets }`), organizers wrap
(`{ organizer }`), coupons send flat bodies.

## Auth

`api-token` collects a Cohost API token and injects it as `Authorization: Bearer …`
via the `sign` hook (actions never see the raw token). `test` verifies the token
with a bounded `GET /orders?limit=1`.

## Develop

```bash
npm install
npm run check   # tsc --noEmit
npm test        # vitest
```

All network egress goes to `api.cohost.vip` (declared in `w6w.network.allow`).
