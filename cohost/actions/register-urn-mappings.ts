import type { ActionDefinition } from "@w6w/types";
import registerUrnMapping from "./register-urn-mapping.ts";

interface Input {
  mappings: Array<{ urn: string; mappedUrn: string; labels?: Record<string, unknown> }>;
}

/** Batch wrapper over `register-urn-mapping`: one POST /rms/urn/mappings per item, in order. */
const registerUrnMappings: ActionDefinition<Input> = {
  key: "register-urn-mappings",
  type: "perform",
  resource: "urn",
  title: "Register URN Mappings",
  description: "Register several URN mappings in order, each exactly as Register URN Mapping does.",
  idempotent: true,
  params: [
    {
      key: "mappings", label: "Mappings", type: "json", required: true,
      hint: "JSON array of { urn, mappedUrn, labels? } — the inputs of Register URN Mapping.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Mappings registered" },
    { key: "results", type: "array", label: "Results, one per mapping, in input order" },
  ],
  async execute(input, ctx) {
    if (!Array.isArray(input.mappings)) throw new Error("Mappings must be a JSON array.");
    const results: unknown[] = [];
    for (const item of input.mappings) results.push(await registerUrnMapping.execute(item, ctx));
    return { count: results.length, results };
  },
};

export default registerUrnMappings;
