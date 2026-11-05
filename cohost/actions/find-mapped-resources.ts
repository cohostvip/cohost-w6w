import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import type { OutputField } from "../lib/w6w-triggers.ts";

interface Input {
  /** The URN whose mapped resources to list, e.g. a ticket-changed trigger's `urn`. */
  urn: string;
  /** All supplied labels must match on the counterpart resource. */
  labels?: Record<string, unknown>;
}

/** One mapped resource, as `GET /rms/urn/search` returns it. */
interface MappedResource {
  urn: string;
  labels: Record<string, unknown>;
  meta: { implementation?: unknown };
}

const RESOURCE_FIELDS: OutputField[] = [
  { key: "urn", type: "string", label: "URN" },
  { key: "labels", type: "object", label: "Labels" },
  { key: "labels.id", type: "string", label: "Provider ID" },
  { key: "labels.name", type: "string", label: "Name" },
  { key: "labels.source", type: "string", label: "Source (eventbrite, …)" },
  { key: "labels.category", type: "string", label: "Category (ticket, event, …)" },
  { key: "labels.eventId", type: "string", label: "Provider event ID" },
  { key: "meta", type: "object", label: "Meta" },
  { key: "meta.implementation", type: "object", label: "Connection app" },
  { key: "meta.implementation.id", type: "string", label: "Connection app ID (eventbrite@1.0.0, …)" },
  { key: "meta.implementation.name", type: "string", label: "Connection app name" },
];

const OUTPUT: OutputField[] = [{ key: "results", type: "array", label: "Mapped resources", items: RESOURCE_FIELDS }];

/**
 * GET /rms/urn/search — every resource mapped to a URN, across all its mapping
 * docs, minus the URN itself and anything outside the caller's company. A
 * connection's resource carries `meta.implementation` (the connection's app), and
 * its URN names the connection: `urn:1:<company>:conn_…:/events/…/ticket_classes/…`.
 *
 * Private endpoint — not in the Node SDK. The API answers with a bare array,
 * wrapped here as `{ results }`.
 */
const findMappedResources: ActionDefinition<Input> = {
  key: "find-mapped-resources",
  type: "read",
  resource: "urn",
  title: "Find Mapped Resources",
  description: "List every resource mapped to a Cohost URN, e.g. the Eventbrite ticket classes linked to a ticket.",
  params: [
    {
      key: "urn",
      label: "URN",
      type: "string",
      required: true,
      hint: "e.g. urn:1:<company>:cohost-falcon:/events/<eventId>/tickets/<ticketId> — a change trigger's urn.",
    },
    {
      key: "labels", label: "Label filters", type: "json", required: false,
      hint: "Optional JSON object with any label keys and values to match on mapped resources. All supplied labels must match; extra stored labels are allowed. Leave empty for no label filtering.",
    },
  ],
  output: OUTPUT,
  sample: {
    results: [
      {
        urn: "urn:1:co_sample:conn_sample:/events/1000000001/ticket_classes/1000000005",
        labels: {
          id: "1000000005",
          name: "General Admission",
          source: "eventbrite",
          category: "ticket",
          eventId: "1000000001",
          "-resource.connectionId": "conn_sample",
        },
        meta: {
          implementation: { id: "eventbrite@1.0.0", name: "Eventbrite" },
        },
      },
    ],
  },

  async execute(input, ctx) {
    ctx.log("info", "finding mapped resources", { urn: input.urn });
    const client = new CohostClient(ctx);
    const results = await client.request<MappedResource[]>("/rms/urn/search", {
      query: { urn: input.urn, labels: input.labels === undefined ? undefined : JSON.stringify(input.labels) },
    });
    return { results };
  },
};

export default findMappedResources;
