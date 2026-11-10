import type { AppDefinition } from "@w6w/types";
import tenant from "./auth/tenant.ts";
import apiToken from "./auth/api-token.ts";
import orderPlaced from "./triggers/order-placed.ts";
import orderChanged from "./triggers/order-changed.ts";
import orderConfirmationRequested from "./triggers/order-confirmation-requested.ts";
import eventChanged from "./triggers/event-changed.ts";
import ticketChanged from "./triggers/ticket-changed.ts";
import attendeeChanged from "./triggers/attendee-changed.ts";
import objectChanged from "./triggers/object-changed.ts";

// Events
import listEvents from "./actions/list-events.ts";
import getEvent from "./actions/get-event.ts";
import searchEvents from "./actions/search-events.ts";
import createEvent from "./actions/create-event.ts";
import updateEvent from "./actions/update-event.ts";
import getEventBlocks from "./actions/get-event-blocks.ts";
import listEventAttendees from "./actions/list-event-attendees.ts";
import getEventAttendee from "./actions/get-event-attendee.ts";

// Tickets (nested under events)
import listEventTickets from "./actions/list-event-tickets.ts";
import getEventTicket from "./actions/get-event-ticket.ts";
import createEventTickets from "./actions/create-event-tickets.ts";
import updateEventTicket from "./actions/update-event-ticket.ts";
import deleteEventTicket from "./actions/delete-event-ticket.ts";

// Orders
import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import listOrderAttendees from "./actions/list-order-attendees.ts";
import sendOrderConfirmation from "./actions/send-order-confirmation.ts";

// Coupons
import listCoupons from "./actions/list-coupons.ts";
import createCoupon from "./actions/create-coupon.ts";
import updateCoupon from "./actions/update-coupon.ts";
import deleteCoupon from "./actions/delete-coupon.ts";

// Organizers
import listOrganizers from "./actions/list-organizers.ts";
import getOrganizer from "./actions/get-organizer.ts";
import createOrganizer from "./actions/create-organizer.ts";
import updateOrganizer from "./actions/update-organizer.ts";
import deleteOrganizer from "./actions/delete-organizer.ts";

// Users
import getMe from "./actions/get-me.ts";
import getUser from "./actions/get-user.ts";
import listUsers from "./actions/list-users.ts";

// URN mappings
import findMappedResources from "./actions/find-mapped-resources.ts";
import resolveUrn from "./actions/resolve-urn.ts";
import registerUrnMapping from "./actions/register-urn-mapping.ts";
import syncObject from "./actions/sync-object.ts";

// Formatting (pure, no API call)
import friendlyValue from "./actions/friendly-value.ts";
import friendlyData from "./actions/friendly-data.ts";
import { withFriendlyOutput } from "./lib/friendly-output.ts";

/**
 * The Cohost w6w app.
 *
 * Triggers are how workflows *start* (`order-placed`, `order-changed`,
 * `order-confirmation-requested`, `event-changed`, `ticket-changed`,
 * `attendee-changed` and the general `object-changed`); actions are how they read and write
 * Cohost. The action set mirrors the **backend-ops** slice of the public API
 * surface published by `@cohostvip/cohost-node` — events, tickets, orders,
 * coupons, organizers and users — catalogued in
 * `.claude/docs/SDK_ENDPOINTS.md`. Adding a backend-ops endpoint there means
 * adding an action here.
 *
 * The cart-session/checkout endpoints (`start-cart-session`,
 * `update-cart-item`, `apply-cart-coupon`, `process-cart-payment`, etc.) are
 * deliberately NOT mirrored: they exist to drive a live checkout from the
 * Node/React SDK in the browser, one HTTP round-trip per user keystroke —
 * not something a backend workflow orchestrates. w6w is for backend ops.
 *
 * The `urn` actions (`find-mapped-resources`, `resolve-urn`, `register-urn-mapping`, `sync-object`) also
 * sit outside it: they read and write the private RMS endpoints (`/rms/urn/*`, `/rms/sync`), which the SDK
 * does not publish, so a workflow can follow a Cohost record to its connected copies and upsert synced
 * events, tickets and orders by URN in one step.
 *
 * Two more actions sit outside that mirror: `friendly-value` and `friendly-data`
 * turn Cohost amounts and UTC timestamps into display-ready fields (see
 * `lib/friendly.ts`), for templates that have no formatting helpers. Every
 * fetch action also takes a `friendly` flag (off by default) that applies the
 * same conversion to its result — `lib/friendly-output.ts`.
 *
 * Every trigger registers a real webhook subscription via
 * `onSubscribe`/`onUnsubscribe` (`POST`/`DELETE /v1/webhooks`). The order
 * triggers enrich the delivered notification into a full order via
 * `GET /orders/{id}` in `handleIngest` — see each trigger file's own header for
 * why (the webhook payload itself never carries the entity); the event/ticket
 * triggers send the change (URN, action, type) plus the fetched object, and
 * `object-changed` sends only the change.
 *
 * The two production Joonbug ("JB") workflows this app replaces map onto
 * this as:
 *   - "send confirmation email" (`wf_jb_send_emails-2`, legacy trigger
 *     `order.confirmation-requested`) → subscribe to
 *     `order-confirmation-requested`, then send via `send-order-confirmation`
 *     or a bespoke template — the legacy version used a Joonbug-specific
 *     template + SendGrid bcc, which has no 1:1 cohost action; that half is a
 *     w6w-native SendGrid step, not something this app provides.
 *   - "sync updates to jb" (`wf_jb_sync_order`/`wf_jb_sync_order_changed`,
 *     legacy triggers `order.placed`/`order.changed`) → subscribe to
 *     `order-placed` or `order-changed`, then an outbound HTTP-POST step (a
 *     w6w-native capability, not a cohost action) to Joonbug's own endpoint.
 */
export default {
  actions: [
    // events
    listEvents,
    getEvent,
    searchEvents,
    createEvent,
    updateEvent,
    getEventBlocks,
    listEventAttendees,
    getEventAttendee,
    // tickets
    listEventTickets,
    getEventTicket,
    createEventTickets,
    updateEventTicket,
    deleteEventTicket,
    // orders
    listOrders,
    getOrder,
    listOrderAttendees,
    sendOrderConfirmation,
    // coupons
    listCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    // organizers
    listOrganizers,
    getOrganizer,
    createOrganizer,
    updateOrganizer,
    deleteOrganizer,
    // users
    getMe,
    getUser,
    listUsers,
    // urn mappings
    findMappedResources,
    resolveUrn,
    registerUrnMapping,
    syncObject,
    // formatting
    friendlyValue,
    friendlyData,
  ].map(withFriendlyOutput),
  triggers: [orderPlaced, orderChanged, orderConfirmationRequested, eventChanged, ticketChanged, attendeeChanged, objectChanged],
  auth: [tenant, apiToken],
} satisfies AppDefinition;
