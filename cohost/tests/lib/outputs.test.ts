/**
 * Every trigger declares the payload it hands a workflow (`output`) and a `sample` of it, so
 * the editor can offer its fields before the trigger first fires. The samples must match the
 * declarations both ways — the same keys+types comparison w6w's app-build runs.
 */
import type { OutputField } from "../../lib/w6w-triggers.ts";
import { expect, test } from "vitest";
import app from "../../index.ts";

type Shape = Record<string, string>;

const typeOf = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** Dotted path -> type; an array's elements sit under `<path>.0`. */
function shapeOf(value: unknown, path = "", shape: Shape = {}): Shape {
  if (path) shape[path] = typeOf(value);
  const prefix = path ? `${path}.` : "";
  if (Array.isArray(value)) for (const el of value) shapeOf(el, `${prefix}0`, shape);
  else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) shapeOf(v, `${prefix}${k}`, shape);
  }
  return shape;
}

function declaredShape(fields: readonly OutputField[]): Shape {
  const shape: Shape = {};
  for (const f of fields) {
    shape[f.key] = f.type;
    if (f.items?.length) {
      shape[`${f.key}.0`] = "object";
      for (const it of f.items) shape[`${f.key}.0.${it.key}`] = it.type;
    }
  }
  // `costs.total` implies `costs` (and `items.0.costs`) is an object.
  for (const key of Object.keys(shape)) {
    for (let i = key.lastIndexOf("."); i > 0; i = key.lastIndexOf(".", i - 1)) {
      shape[key.slice(0, i)] ??= "object";
    }
  }
  return shape;
}

test("every trigger declares output and a sample", () => {
  for (const trigger of app.triggers) {
    expect(Array.isArray(trigger.output), `${trigger.key} declares output`).toBe(true);
    expect(trigger.sample, `${trigger.key} has a sample`).toBeTruthy();
  }
});

test("every trigger sample matches its declared output, both ways", () => {
  for (const trigger of app.triggers) {
    const declared = declaredShape(trigger.output as OutputField[]);
    const observed = shapeOf(trigger.sample);
    const isLeafArray = (key: string) => declared[key] === "array" && declared[`${key}.0`] === undefined;

    const missing = Object.keys(declared).filter((k) => !(k in observed));
    // Elements of an un-itemized array (`tags`, `changedFields`) are not declared, by design.
    const extra = Object.keys(observed).filter((k) => !(k in declared) && !isLeafArray(k.split(".0")[0]));
    const mismatched = Object.keys(declared).filter(
      (k) => k in observed && observed[k] !== "null" && observed[k] !== declared[k],
    );

    expect({ trigger: trigger.key, missing, extra, mismatched }).toEqual({
      trigger: trigger.key,
      missing: [],
      extra: [],
      mismatched: [],
    });
  }
});
