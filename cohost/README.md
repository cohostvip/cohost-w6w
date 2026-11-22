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
│   ├── attendee-changed.ts               # fires on `attendee.*` (one per attendee an order creates)
│   ├── object-changed.ts                 # general: any picked type × action
│   ├── channel-event-changed.ts          # fires on `channelEvent.*` (one per channel listing)
│   └── channel-changed.ts                # one trigger for a channel: `event.change` (`channelEvent.*`) + `ticket.change` (`offering.*`, listed events only)
└── lib/
    ├── client.ts            # thin ctx.fetch wrapper over api.cohost.vip
    ├── params.ts            # shared param / output fragments (pagination, resources)
    ├── outputs.ts           # trigger payload shapes: declared output + sample
    ├── types.ts             # minimal structural types for the resources
    ├── notification.ts      # the webhook ping; shared subscribe/unsubscribe
    ├── payload.ts           # ping → the one trigger payload {urn, action, type, id, timestamp, data, meta}
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
  (pick which; created, updated and deleted by default).
- **Ticket Changed** — fires on `offering.created` / `updated` / `deleted` (tickets
  are offerings on the platform).
- **Attendee Changed** — fires on `attendee.created` / `checked_in` / `deleted`
  (created only by default). A placed order creates one attendee per admission, so a
  3-ticket order runs the workflow three times — once per guest. `data.orderId` leads
  to `get-order`.
- **Object Changed** — the general trigger. Pick the types (event, ticket/offering,
  order, attendee) and actions (created, updated, deleted by default; also published,
  placed, refunded, checked in); it subscribes to every combination Cohost emits.
- **Channel Event Changed** — fires on `channelEvent.listed` / `changed` / `unlisted`
  for the **channel owner**: an event is listed on one of your sales channels, its
  listing changed (the event, any of its tickets — prices included — or the organizer's
  channel customization), or it was unlisted (removed, hidden, cancelled or back to
  draft). One delivery per listing — `meta.channelId` + `meta.listingId` say which —
  and `data` is the listing exactly as the channel shows it (`GET /events/{id}?listingId=…`
  with the channel header: channel name, description, prices and `salesEnabled`); `null`
  once unlisted. Pausing or resuming ticket sales on the channel fires it too, with
  `changedFields` `customization`. Fetch the listing's tickets at channel prices with
  `list-channel-event-tickets`.
  Optional `channelId` narrows it to one channel. Built for mirroring a channel's
  events to another marketplace (an internal "publish to Eventbrite" channel).
  `meta.properties` carries the values the channel keeps on the listing — the
  properties it declares in its settings, e.g. an `eventbriteId` — so a run knows
  whether to create or update the copy elsewhere (on `unlisted`, the values the
  listing had). Write them back with `set-channel-listing-properties`.

`*.changed` events are never subscribed by the change triggers: Cohost fires one with
every `*.updated`, so they would deliver each update twice.

### One payload for every trigger

Every trigger hands the workflow the same shape (`lib/payload.ts`), so a field is in the
same place whichever trigger started the run:

```jsonc
{
  "urn": "urn:1:co_1:cohost-falcon:/orders/ord_1", // the object that changed
  "action": "order.placed",                         // <type>.<what happened>: event.updated, offering.deleted, …
  "type": "order",                                  // event | offering | order | attendee
  "id": "ord_1",                                    // the object's own id
  "timestamp": "2026-11-01T20:34:10.000Z",
  "data": { "...": "the object" },                  // null once deleted
  "meta": {
    "changedFields": ["costs", "costs.total"],      // [] when not an update
    "companyId": "co_1",
    "eventId": "ev_1",                              // its event; null when it has none
    "resourcePath": "/orders/ord_1",
    "deliveryId": "trg_1",                          // Cohost's id for this delivery (dedupe key)
    "transactions": []                              // orders only: payment transactions
  }
}
```

- `data` is the object as its `get-*` action returns it — the order (`get-order`'s
  `order`: read `data.customer.email`, `data.costs.total`, `data.items`), the event,
  the ticket or the attendee. Cohost's webhook is only a notification
  (`{id, action, urn, context, data?: {changedFields}}`), never the object, so
  `handleIngest` fetches it. A deleted object has nothing to fetch: `data` is `null`.
- `meta.changedFields` lists each changed top-level key plus every changed dotted path
  under it — a tax change gives `["costs", "costs.tax", "costs.total"]`; arrays are
  listed whole. It names fields only: the old values are not sent.
- An order's `meta.eventId` comes from its `contextId` (`evt_<id>`); events, tickets
  and attendees take it from their path.

Each trigger's `onSubscribe`/`onUnsubscribe` register/deregister a real Cohost
webhook (`POST`/`DELETE /v1/webhooks`) against the `callbackUrl` the runtime hands it.

Every trigger declares its payload as `output` plus a synthetic `sample`
(`lib/outputs.ts`), so the editor offers its fields before the trigger first fires.
`tests/lib/outputs.test.ts` keeps each sample in step with its `output`, and every
trigger's declared envelope identical.

## Actions

### Events (`resource: event`)

| Key | Endpoint |
| --- | --- |
| `list-events` | `GET /events` |
| `get-event` | `GET /events/{id}` |
| `search-events` | `GET /search?types=event` (`page`/`size` mapped onto `limit`/`offset`) |
| `create-event` | `POST /events` |
| `update-event` | `PATCH /events/{id}` |
| `get-event-blocks` | `GET /events/{id}/blocks` |
| `list-event-attendees` | `GET /events/{id}/attendees` |
| `get-event-attendee` | `GET /events/{id}/attendees/{attendeeId}` |

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
| `upsert-order` | `POST /orders` |

**Upsert Order** (`upsert-order`) inserts or updates an order by `order.urn`. Its one
param, **Order Data**, is the request body as is — `{ order, source?, attendees?, context? }`,
which is exactly the Eventbrite → Cohost transformer's `data`. `order.contextId` may be the
event's remote URN (Cohost resolves it through the event's mapping); `attendees` (ticket
holders bound by `orderItemId`) become the order's attendees, with their own names and
barcodes. `order.urn` is required so a retried step updates instead of duplicating. Returns
`{ order, meta }` (`meta.action` is `create` or `update`).

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

### Sales channels (`resource: channel`)

| Key | Endpoint |
| --- | --- |
| `list-channels` | `GET /company/sales-channels` |
| `get-channel` | `GET /company/sales-channels/{id}` |
| `create-channel` | `POST /company/sales-channels` |
| `update-channel` | `PUT /company/sales-channels/{id}` |
| `delete-channel` | `DELETE /company/sales-channels/{id}` |
| `list-channel-events` | `GET /company/sales-channels/{id}/events` |
| `list-channel-event-listings` | `GET /company/sales-channels/{id}/events/{eventId}/listings` |
| `set-channel-event-visibility` | `PATCH /company/sales-channels/{id}/events/{eventId}/listing` |
| `remove-channel-event` | `DELETE /company/sales-channels/{id}/events/{eventId}` |
| `get-channel-event` | `GET /events/{id}` + `GET /events/{id}/tickets`, with `x-cohost-channel-id` |
| `list-channel-event-tickets` | `GET /events/{id}/tickets`, with `x-cohost-channel-id` |
| `set-channel-listing-properties` | `PATCH /company/sales-channels/{id}/events/{eventId}/listings/{listingId}/properties` |

The channel actions manage the sales channels your company owns. Creating, updating or
deleting a channel needs an admin, editor or owner role in the company.
A channel can have a **default price**: a price formula (*Default price formula ID*) or a
markup (*Default markup %*). It prices your own events' listings on the channel that set no
formula or markup of their own. A listing's own formula or markup (even 0%) and a ticket's
formula or set price still win. `update-channel` changes it with the same two fields, a
markup of `0` or *Clear the default pricing* removes it, and each affected listing fires
**Channel Event Changed** with `customization` in `changedFields`. The channel's outputs
include `pricing`.
Making a channel public (or asking to) needs its marketplace branding first: a `logo` and a
`brandColor`. Without them Cohost refuses with `SALES_CHANNEL_BRANDING_REQUIRED`.
`list-channel-events` pages through the events listed on a channel (`results` + `total`).
Each event is its public profile plus its listing state on the channel: visibility, tags,
meta and priority. Hidden listings are included; removed ones are not.
`set-channel-event-visibility` hides an event on the channel without removing it, which
fires **Channel Event Changed** as `unlisted`; showing it again fires `listed`.
`remove-channel-event` takes the event off the channel and puts its application back to
pending.

`get-channel-event` fetches one listing of an event as your channel shows it. That is the
channel's name and description for it, and `salesEnabled`, which is `false` while the
organizer has paused ticket sales on the channel. It also returns `tickets`, each at its
channel price (the organizer's flat price, price formula or markup, plus the channel's
fees).
`list-channel-event-tickets` returns just those tickets, as `results`. Both read live and
sold-out tickets only, without the owner's capacity or sales figures, and each ticket's
`status` reads `unavailable` while sales are paused. `listingId` defaults to `primary`.
Both fail with a plain message when the channel does not show the listing: it is not listed
there, it is hidden, or it is not live.

`set-channel-listing-properties` sets the values your channel keeps on one listing of an event (`listingId` defaults to
`primary`). Keys must be properties the channel declares in its settings, each value of its
declared type; `null` clears one, keys left out keep theirs. The next **Channel Event
Changed** for the listing carries them in `meta.properties`, and the write itself does not
fire that trigger — a publish-to-Eventbrite workflow can store the id it created without
re-triggering itself.

### Price formulas (`resource: price-formula`)

| Key | Endpoint |
| --- | --- |
| `list-price-formulas` | `GET /company/price-formulas` |
| `get-price-formula` | `GET /company/price-formulas/{id}` |
| `create-price-formula` | `POST /company/price-formulas` |
| `update-price-formula` | `GET` + `PUT /company/price-formulas/{id}` |
| `delete-price-formula` | `DELETE /company/price-formulas/{id}` |
| `assign-price-formula` | `GET` + `PUT /events/{id}/channels/{channelId}/customization` |

A price formula is a named pricing rule your company saves once, in the dashboard under
Pricing → Formulas or with these actions. It is a markup percent, then a flat amount added,
for example "Eventbrite VIP: 15% + $10". It can also cap what it adds to a ticket, either at an amount
("25% + $10, at most $100": a $400 ticket gets $100 added, not $110) or at a percent of the price
("10% + $10, at most 20%": a $50 ticket gets $10 added, not $15). The amount is added only to tickets priced in the
formula's currency. You assign a formula to tickets on a channel listing. Changing the formula
later reprices every ticket it is assigned to, across all events and channels, on the
channel's pages and in new carts. Each of those listings then fires **Channel Event Changed**
with `customization` in `changedFields`, so a publish-to-Eventbrite workflow can push the new
prices.

- `list-price-formulas` returns each formula with `usage`: the number of events, listings and
  tickets that use it, and the number of channels whose default price it is.
- `get-price-formula` adds `assignments`: for each listing, the event, channel and listing, and
  the ticket ids the formula prices on it. It also adds `channels`, the channels whose default
  price it is.
- `create-price-formula` and `update-price-formula` take the amount in major units (`10` for
  $10.00). For a cap, set `capType` (`amount` or `percent`) and `cap` (`100` for $100.00, in
  the amount's currency, or `20` for 20%). `update-price-formula` keeps any field you leave
  blank; `0` removes the markup or the amount, and `capType: none` removes the cap.
- `delete-price-formula` is refused while any listing still uses the formula.
- `assign-price-formula` prices the named tickets of an event on a channel by a formula
  (`tickets`, comma or line separated). Any flat channel price those tickets had is dropped,
  because a flat price wins over a formula. With no tickets named, it sets the formula for
  the whole listing, which then prices every ticket that has neither its own price nor its own
  formula. A blank `formulaId` removes the formula. The rest of the listing's customization is
  kept.

Creating, updating and deleting formulas needs an admin, editor or owner role in the company.
Assigning one needs ownership of the event.

A ticket's channel price follows this order of precedence:
1. its own flat price;
2. its formula;
3. the listing's formula;
4. the listing's markup;
5. the event's own price.

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
no router, no separate lookup. It calls `POST /rms/sync` with:

- **Type** — `event`/`ticket`/`order` (a transformer's `type`).
- **Data** — the object (a transformer's `data`), optionally with `event_urn`. A
  transformer's whole output (`{ type, urn, data }`) also works as is: it is unwrapped,
  its `type` is used, and its `urn` becomes the Mapped URN. With no URN set, the
  object's own `urn` (`order.urn` for an order body) is used.
- **Mapped URN** — the remote URN (a transformer's `urn`). Cohost looks up the
  object it is mapped to and updates it; if it is not mapped yet, the object is
  inserted and the mapping recorded.
- **Mapped URN Labels** — merged onto the mapping, the same way Register URN
  Mapping stores them.
- **Cohost URN** (optional) — forces a specific Cohost object; usually empty.

```json
{
  "type": "order",
  "data": { "orderNumber": "…", "event_urn": "urn:1:<company>:conn_…:/events/<remote-id>" },
  "mappedUrn": "urn:1:<company>:conn_…:/orders/<remote-id>",
  "mappedUrnLabels": { "source": "eventbrite" }
}
```

A ticket's or order's `data.event_urn` (our event URN, or a remote one the event was
synced from) names its event: a ticket is placed under it, and the order's context
(`evt_<id>`, organizer) is built from it — so sync the event first. A ticket already
mapped, or one whose remote parent event is mapped, finds its event without it. An
event's `data.tickets` are saved with the event. It returns
`{ type, urn, mappedUrn, mappedUrnLabels, id, data, meta }`: our URN, the saved object,
and `meta.action` (`create`/`update`) with the changed fields. A payload identical to the
last one synced to the object is not written again: it returns `meta.action: "unchanged"`
(`changed: []`) with the object as it is now in `data`. Sync only inserts or updates; it
never deletes.

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
