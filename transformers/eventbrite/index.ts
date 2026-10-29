import type { AppDefinition } from "@w6w/types";
import eventbriteToCohost from "./actions/eventbrite-to-cohost.ts";
import cohostToEventbrite from "./actions/cohost-to-eventbrite.ts";

/**
 * The Eventbrite ⇄ Cohost transformer app.
 *
 * A pure, offline transformer: actions map objects between Eventbrite's
 * shape and Cohost's shape. There is no auth and no network egress
 * (`w6w.network.allow` is empty) — a workflow fetches with the Eventbrite/Cohost
 * apps, pipes the object through a transform here, then writes with the other app.
 *
 * Both directions resolve events, tickets, orders, and collections by structure,
 * including expanded children.
 */
export default {
  actions: [
    eventbriteToCohost,
    cohostToEventbrite,
  ],
} satisfies AppDefinition;
