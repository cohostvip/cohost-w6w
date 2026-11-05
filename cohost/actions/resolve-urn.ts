import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

interface Input {
  /** Any mapped URN — a Cohost record's or a connection's. */
  urn: string;
  /** Only resources of this `-resource.@type`, e.g. `system-resource` (Cohost records). */
  type?: string;
}

/**
 * A resource entry's own keys vary by kind (`-resource.id` / `-resource.path` on a
 * Cohost record, provider labels such as `id` / `name` / `source` on a
 * connection's), and the `-resource.*` keys contain dots, so only `urn` is declared.
 */
const OUTPUT: OutputField[] = [
  { key: "urn", type: "string", label: "URN" },
  { key: "labels", type: "object", label: "Labels" },
  { key: "resources", type: "array", label: "Resources", items: [{ key: "urn", type: "string", label: "URN" }] },
];

/**
 * POST /rms/urn/resolve — the URN's own mapping doc: its labels plus every
 * resource in it. The reverse of `find-mapped-resources`' typical use: from an
 * Eventbrite ticket class URN to the Cohost ticket it belongs to
 * (`type: system-resource`).
 *
 * Private endpoint — not in the Node SDK. 404s when the URN has no mapping doc.
 */
const resolveUrn: ActionDefinition<Input> = {
  key: "resolve-urn",
  type: "read",
  resource: "urn",
  title: "Resolve URN",
  description: "Get a URN's mapping: its labels and the resources mapped to it, optionally only Cohost records.",
  params: [
    {
      key: "urn",
      label: "URN",
      type: "string",
      required: true,
      hint: "e.g. urn:1:<company>:conn_…:/events/<id>/ticket_classes/<id>",
    },
    {
      key: "type",
      label: "Resource Type",
      type: "string",
      hint: "Optional. system-resource returns only the Cohost records. Empty returns every resource.",
    },
  ],
  output: OUTPUT,

  async execute(input, ctx) {
    ctx.log("info", "resolving urn", { urn: input.urn, type: input.type });
    const client = new CohostClient(ctx);
    return client.request("/rms/urn/resolve", {
      method: "POST",
      body: { urn: input.urn, ...(input.type ? { type: input.type } : {}) },
    });
  },
};

export default resolveUrn;
