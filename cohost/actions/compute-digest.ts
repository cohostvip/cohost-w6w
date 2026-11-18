import type { ActionDefinition } from "@w6w/types";
import { computeDigest, parseFields } from "../lib/digest.ts";

interface Input {
  data: unknown;
  fields?: string[] | string;
}

/**
 * A content digest of an object — or of only the fields that matter, e.g. an
 * Eventbrite order's `id`, `status`, `changed`, `costs.gross` — computed locally.
 * Same input, same digest; see `lib/digest.ts` for the recipe.
 */
const computeDigestAction: ActionDefinition<Input, { digest: string; fields: string[] | null }> = {
  key: "compute-digest",
  type: "perform",
  resource: "format",
  title: "Compute Digest",
  description:
    "Compute a content digest (v1:<sha256>) of an object, or of the fields you pick. Stamp it with Sync Object and compare it later with Validate URN Digest to skip unchanged records.",
  idempotent: true,
  requiresAuth: false,
  params: [
    {
      key: "data",
      label: "Data",
      type: "json",
      required: true,
      hint: "The object to digest, e.g. the Eventbrite order as fetched.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: false,
      hint: 'Optional dot paths to digest, e.g. ["id", "status", "changed", "costs.gross.value"]. Empty digests the whole object. Use the same list every time.',
    },
  ],
  output: [
    { key: "digest", type: "string", label: "Digest" },
    { key: "fields", type: "array", label: "Fields Digested (sorted; null = whole object)" },
  ],
  async execute(input) {
    if (input.data === undefined) throw new Error("Data is required.");
    const fields = parseFields(input.fields);
    return { digest: await computeDigest(input.data, fields), fields: fields ?? null };
  },
};

export default computeDigestAction;
