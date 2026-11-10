/**
 * App-manifest invariants. These guard the property that matters most about the
 * action set: it is a faithful, non-colliding mirror of the backend-ops endpoints
 * the Cohost Node SDK publishes (catalogued in `.claude/docs/SDK_ENDPOINTS.md`) —
 * the cart-session/checkout endpoints are deliberately excluded, see `index.ts`.
 */
import { expect, test } from "vitest";
import app from "../index.ts";

test("action keys are unique", () => {
  const keys = app.actions.map((a) => a.key);
  expect(new Set(keys).size).toBe(keys.length);
});

test("one action per backend-ops SDK endpoint", () => {
  // The `format` actions are local conversions and the `urn` actions read private
  // endpoints — neither is an SDK endpoint. 29 = the 28 catalogued endpoints plus
  // `get-event-attendee` (`GET /events/{id}/attendees/{attendeeId}`), public but not yet
  // wrapped by the Node SDK.
  expect(app.actions.filter((a) => a.resource !== "format" && a.resource !== "urn")).toHaveLength(29);
});

test("every fetch action takes a friendly flag, off by default", () => {
  for (const action of app.actions) {
    const flag = action.params?.find((p) => p.key === "friendly");
    if (action.type === "read" || action.type === "search") {
      expect(flag, `${action.key} has the friendly flag`).toMatchObject({ type: "boolean", default: false });
      expect(flag?.required, `${action.key} friendly flag is optional`).toBeFalsy();
    } else {
      expect(flag, `${action.key} has no friendly flag`).toBeUndefined();
    }
  }
});

test("every action is fully declared", () => {
  for (const action of app.actions) {
    expect(action.key, `${action.key} key is kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(action.title, `${action.key} has a title`).toBeTruthy();
    expect(action.description, `${action.key} has a description`).toBeTruthy();
    expect(action.resource, `${action.key} has a resource`).toBeTruthy();
    expect(action.output, `${action.key} declares output`).toBeTruthy();
    expect(typeof action.execute, `${action.key} has an execute hook`).toBe("function");
  }
});

test("required params come before optional ones in every form", () => {
  for (const action of app.actions) {
    const flags = (action.params ?? []).map((p) => p.required === true);
    const lastRequired = flags.lastIndexOf(true);
    const firstOptional = flags.indexOf(false);
    if (lastRequired !== -1 && firstOptional !== -1) {
      expect(firstOptional, `${action.key} params are ordered`).toBeGreaterThan(lastRequired);
    }
  }
});

test("write actions declare an idempotency stance", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      expect(typeof action.idempotent, `${action.key} declares idempotent`).toBe("boolean");
    }
  }
});

test("actions that create or send are not marked idempotent", () => {
  const unsafe = [
    "create-event",
    "create-event-tickets",
    "create-coupon",
    "create-organizer",
    "send-order-confirmation",
  ];
  for (const key of unsafe) {
    const action = app.actions.find((a) => a.key === key);
    expect(action, `${key} exists`).toBeDefined();
    expect(action!.idempotent, `${key} is not idempotent`).toBe(false);
  }
});
