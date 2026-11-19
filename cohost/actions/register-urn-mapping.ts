import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

interface Input {
  urn: string;
  mappedUrn: string;
  labels?: Record<string, unknown>;
}

const parse = (urn: string) => {
  const match = /^urn:1:([^:\s/]+):([^:\s/]+):(\/[^\s?#]+)$/.exec(urn);
  if (!match || match[3].slice(1).split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Expected urn:1:<company>:<service>:/<resource-path>.");
  }
  return { company: match[1], service: match[2], path: match[3] };
};

/** The external URN owns the mapping document, matching RMS's inbound mapping convention. */
const registerUrnMapping: ActionDefinition<Input> = {
  key: "register-urn-mapping",
  type: "perform",
  resource: "urn",
  title: "Register URN Mapping",
  description: "Map a Cohost resource to another resource, such as an Eventbrite event, with searchable labels.",
  idempotent: true,
  params: [
    {
      key: "urn", label: "Cohost URN", type: "string", required: true,
      hint: "The existing Cohost resource, e.g. urn:1:<company>:cohost-falcon:/events/<id>.",
    },
    {
      key: "mappedUrn", label: "Mapped Resource URN", type: "string", required: true,
      hint: "The resource you created, e.g. urn:1:<company>:conn_…:/events/<eventbrite-id>.",
    },
    {
      key: "labels", label: "Labels", type: "json", required: false,
      hint: "Optional JSON object saved on the mapped resource. Find Mapped Resources can filter by these labels. Existing labels are merged; no labels are added by default.",
    },
  ],
  output: [
    { key: "urn", type: "string", label: "Mapped Resource URN" },
    { key: "labels", type: "object", label: "Labels" },
    { key: "resourceUrns", type: "array", label: "Resource URNs" },
    { key: "resources", type: "object", label: "Mapped Resources" },
  ],
  async execute(input, ctx) {
    const local = parse(input.urn);
    const mapped = parse(input.mappedUrn);
    const internal = (service: string) => service === "cohost-falcon" || service === "cohost-puma";
    if (!internal(local.service)) throw new Error("Cohost URN must use cohost-falcon or cohost-puma.");
    if (local.company !== mapped.company) throw new Error("Both URNs must belong to the same company.");
    if (internal(mapped.service) && local.path === mapped.path) throw new Error("Cannot map a resource to itself.");
    if (input.labels !== undefined &&
        (input.labels === null || typeof input.labels !== "object" || Array.isArray(input.labels))) {
      throw new Error("Labels must be a JSON object.");
    }
    const labels = input.labels ?? {};
    ctx.log("info", "registering urn mapping", { urn: input.urn, mappedUrn: input.mappedUrn });
    return new CohostClient(ctx).request("/rms/urn/mappings", {
      method: "POST",
      body: {
        urn: input.mappedUrn,
        labels,
        resources: [{ ...labels, urn: input.mappedUrn }, { urn: input.urn }],
      },
    });
  },
};

export default registerUrnMapping;
