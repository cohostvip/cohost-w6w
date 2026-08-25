import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import orderPlaced from "./triggers/order-placed.ts";
import orderChanged from "./triggers/order-changed.ts";
import orderConfirmationRequested from "./triggers/order-confirmation-requested.ts";

// Events
import listEvents from "./actions/list-events.ts";
import getEvent from "./actions/get-event.ts";
import searchEvents from "./actions/search-events.ts";
import createEvent from "./actions/create-event.ts";
import updateEvent from "./actions/update-event.ts";
import getEventBlocks from "./actions/get-event-blocks.ts";
import listEventAttendees from "./actions/list-event-attendees.ts";

// Tickets (nested under events)
import listEventTickets from "./actions/list-event-tickets.ts";
import createEventTickets from "./actions/create-event-tickets.ts";
import updateEventTicket from "./actions/update-event-ticket.ts";
import deleteEventTicket from "./actions/delete-event-ticket.ts";

// Orders
import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import listOrderAttendees from "./actions/list-order-attendees.ts";
import sendOrderConfirmation from "./actions/send-order-confirmation.ts";

// Cart sessions (checkout)
import startCartSession from "./actions/start-cart-session.ts";
import getCartSession from "./actions/get-cart-session.ts";
import updateCartSession from "./actions/update-cart-session.ts";
import cancelCartSession from "./actions/cancel-cart-session.ts";
import updateCartItem from "./actions/update-cart-item.ts";
import preValidateCartPayment from "./actions/pre-validate-cart-payment.ts";
import createCartPaymentIntent from "./actions/create-cart-payment-intent.ts";
import processCartPayment from "./actions/process-cart-payment.ts";
import placeCartOrder from "./actions/place-cart-order.ts";
import joinCartTable from "./actions/join-cart-table.ts";
import applyCartCoupon from "./actions/apply-cart-coupon.ts";
import removeCartCoupon from "./actions/remove-cart-coupon.ts";

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

/**
 * The Cohost w6w app.
 *
 * Triggers are how workflows *start* (`order-placed`, `order-changed`,
 * `order-confirmation-requested`); actions are how they read and write
 * Cohost. The action set is a 1:1 mirror of the public API surface published
 * by `@cohostvip/cohost-node` — 39 endpoints, catalogued in
 * `.claude/docs/SDK_ENDPOINTS.md`. Adding an endpoint there means adding an
 * action here.
 *
 * All three triggers register a real webhook subscription via
 * `onSubscribe`/`onUnsubscribe` (`POST`/`DELETE /v1/webhooks`) and enrich the
 * delivered notification into a full order via `GET /orders/{id}` in
 * `handleIngest` — see each trigger file's own header for why (the webhook
 * payload itself never carries the entity).
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
    // tickets
    listEventTickets,
    createEventTickets,
    updateEventTicket,
    deleteEventTicket,
    // orders
    listOrders,
    getOrder,
    listOrderAttendees,
    sendOrderConfirmation,
    // cart
    startCartSession,
    getCartSession,
    updateCartSession,
    cancelCartSession,
    updateCartItem,
    preValidateCartPayment,
    createCartPaymentIntent,
    processCartPayment,
    placeCartOrder,
    joinCartTable,
    applyCartCoupon,
    removeCartCoupon,
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
  ],
  triggers: [orderPlaced, orderChanged, orderConfirmationRequested],
  auth: [apiToken],
} satisfies AppDefinition;
