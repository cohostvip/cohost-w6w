import type { AppDefinition } from "@w6w/types";
import eventbriteEventToCohost from "./actions/eventbrite-event-to-cohost.ts";
import cohostEventToEventbrite from "./actions/cohost-event-to-eventbrite.ts";
import eventbriteTicketToCohost from "./actions/eventbrite-ticket-to-cohost.ts";
import cohostTicketToEventbrite from "./actions/cohost-ticket-to-eventbrite.ts";
import eventbriteOrderToCohost from "./actions/eventbrite-order-to-cohost.ts";
import cohostOrderToEventbrite from "./actions/cohost-order-to-eventbrite.ts";

/**
 * The Eventbrite ⇄ Cohost transformer app.
 *
 * A pure, offline transformer: every action maps one object between Eventbrite's
 * shape and Cohost's shape. There is no auth and no network egress
 * (`w6w.network.allow` is empty) — a workflow fetches with the Eventbrite/Cohost
 * apps, pipes the object through a transform here, then writes with the other app.
 *
 * Three object families, both directions:
 *   - Event    ↔  eventbrite-event-to-cohost   / cohost-event-to-eventbrite
 *   - Ticket   ↔  eventbrite-ticket-to-cohost  / cohost-ticket-to-eventbrite
 *   - Order    ↔  eventbrite-order-to-cohost   / cohost-order-to-eventbrite
 */
export default {
  actions: [
    eventbriteEventToCohost,
    cohostEventToEventbrite,
    eventbriteTicketToCohost,
    cohostTicketToEventbrite,
    eventbriteOrderToCohost,
    cohostOrderToEventbrite,
  ],
} satisfies AppDefinition;
