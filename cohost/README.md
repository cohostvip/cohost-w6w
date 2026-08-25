# Cohost w6w App

A [w6w](https://github.com/w6w-io/w6w-core) App for [Cohost](https://cohost.vip). It
exposes Cohost order **events** as triggers and the whole public Cohost API as
**actions**, so workflows can both react to and drive Cohost on the w6w runtime.

The action set is a 1:1 mirror of the endpoints published by the
[`@cohostvip/cohost-node`](https://www.npmjs.com/package/@cohostvip/cohost-node) SDK —
39 endpoints across events, tickets, orders, cart sessions, coupons, organizers and
users. When an endpoint is added to that SDK, add an action here.

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
├── actions/                              # one file per endpoint, one action per endpoint
├── triggers/
│   ├── order-placed.ts                   # fires on `order.placed`
│   ├── order-changed.ts                  # fires on `order.changed`
│   └── order-confirmation-requested.ts   # fires on `order.confirmation-requested`
└── lib/
    ├── client.ts            # thin ctx.fetch wrapper over api.cohost.vip
    ├── params.ts            # shared param / output fragments (pagination, resources)
    ├── types.ts             # minimal structural types for the resources
    └── w6w-triggers.ts      # forward-compat shim: trigger types not yet in @w6w/types
```

## Triggers

- **Order Placed** — fires on `order.placed`.
- **Order Changed** — fires on `order.changed`.
- **Order Confirmation Requested** — fires on `order.confirmation-requested`, the
  narrower signal Cohost's own messaging layer emits when a confirmation email is
  actually due (not every placed order needs one).

Each trigger's `onSubscribe`/`onUnsubscribe` register/deregister a real Cohost
webhook (`POST`/`DELETE /v1/webhooks`) against the `callbackUrl` the runtime hands
it. `handleIngest` does **not** pass the delivered webhook ping straight through —
Cohost's webhook payload is a notification (`{id, action, urn, context,
changedFields?}`), never the entity itself — so it fetches the full order via
`GET /orders/{id}` before handing it to the workflow. `output` declares the
resulting order fields for editor autocomplete.

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

### Cart sessions — checkout (`resource: cart`)

| Key | Endpoint |
| --- | --- |
| `start-cart-session` | `POST /cart/sessions` |
| `get-cart-session` | `GET /cart/sessions/{id}` |
| `update-cart-session` | `PATCH /cart/sessions/{id}` |
| `cancel-cart-session` | `DELETE /cart/sessions/{id}` |
| `update-cart-item` | `POST /cart/sessions/{id}/item` |
| `pre-validate-cart-payment` | `POST /cart/sessions/{id}/payment/pre-validate` |
| `create-cart-payment-intent` | `POST /cart/sessions/{id}/payment/payment-intent` |
| `process-cart-payment` | `POST /cart/sessions/{id}/payment/process` |
| `place-cart-order` | `POST /cart/sessions/{id}/place-order` |
| `join-cart-table` | `POST /cart/sessions/{id}/join-table` |
| `apply-cart-coupon` | `POST /cart/sessions/{id}/coupons` |
| `remove-cart-coupon` | `DELETE /cart/sessions/{id}/coupons/{couponId}` |

The happy path is start → `update-cart-item` → `pre-validate-cart-payment` →
`create-cart-payment-intent` → `process-cart-payment` → `place-cart-order`.
`update-cart-item` sets an **absolute** quantity, so `quantity: 0` removes an item —
that is why there is no separate remove-item action (the SDK's `deleteItem` is a
wrapper over the same endpoint, not an endpoint of its own).

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
- `DELETE` endpoints, which return no content, report `{ deleted: true, id }`
  (`cancel-cart-session` reports `{ cancelled: true, id }`).

Body wrapping is **not** uniform across the API and the actions follow it faithfully:
events wrap (`{ event }`, `{ ticket }` / `{ tickets }`), organizers wrap
(`{ organizer }`), coupons and cart sessions send flat bodies.

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
