/**
 * App-manifest invariants. These guard the property that matters most about the
 * action set: it is a faithful, non-colliding mirror of the 39 endpoints the
 * Cohost Node SDK publishes (catalogued in `.claude/docs/SDK_ENDPOINTS.md`).
 */
import { expect, test } from "vitest";
import app from "../index.ts";

test("action keys are unique", () => {
  const keys = app.actions.map((a) => a.key);
  expect(new Set(keys).size).toBe(keys.length);
});

test("one action per SDK endpoint", () => {
  expect(app.actions).toHaveLength(39);
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
    "start-cart-session",
    "process-cart-payment",
    "place-cart-order",
    "send-order-confirmation",
  ];
  for (const key of unsafe) {
    const action = app.actions.find((a) => a.key === key);
    expect(action, `${key} exists`).toBeDefined();
    expect(action!.idempotent, `${key} is not idempotent`).toBe(false);
  }
});
