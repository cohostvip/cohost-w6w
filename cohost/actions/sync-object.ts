import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

type SyncType = "event" | "ticket" | "order";

interface Input {
  type: SyncType;
  data: Record<string, unknown>;
  mappedUrn?: string;
  mappedUrnLabels?: Record<string, unknown>;
  urn?: string;
}

const TYPES: SyncType[] = ["event", "ticket", "order"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * One step instead of a router: send any synced object as `data` with its `type`
 * and the remote URN it came from (e.g. a transformer's `urn`) as `mappedUrn`.
 * Cohost's `POST /v1/rms/sync` looks up the Cohost object that URN is mapped to and
 * updates it, or inserts the object and records the mapping (with `mappedUrnLabels`).
 * A ticket's or order's `data.event_urn` names its event. `urn` (ours) only forces a
 * specific Cohost object. One identity is required, so a retried step never duplicates.
 */
const syncObject: ActionDefinition<Input> = {
  key: "sync-object",
  type: "perform",
  resource: "urn",
  title: "Sync Object",
  description:
    "Insert or update a Cohost event, ticket or order. Pass the converted object as data, its type, and the remote URN it came from; Cohost updates the object that URN is mapped to, or inserts and maps it. Returns the saved object.",
  idempotent: true,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "event", label: "Event" },
        { value: "ticket", label: "Ticket" },
        { value: "order", label: "Order" },
      ],
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      required: true,
      hint: "The object to save, in Cohost's shape (e.g. a transformer's converted `data`).",
    },
    {
      key: "mappedUrn",
      label: "Mapped URN",
      type: "string",
      required: false,
      hint: "The remote resource's URN, e.g. the transformer's urn (urn:1:<company>:conn_…:/events/<id>). Updates the Cohost object it is mapped to, or inserts the object and maps it.",
    },
    {
      key: "mappedUrnLabels",
      label: "Mapped URN Labels",
      type: "json",
      required: false,
      hint: 'Labels merged onto the mapping, e.g. { "source": "eventbrite" }; searchable with Find Mapped Resources.',
    },
    {
      key: "urn",
      label: "Cohost URN",
      type: "string",
      required: false,
      hint: "Optional: force a specific Cohost object (urn:1:<company>:cohost-falcon:/events/<id>). Usually left empty.",
    },
  ],
  output: [
    { key: "type", type: "string", label: "Type" },
    { key: "urn", type: "string", label: "Cohost URN" },
    { key: "mappedUrn", type: "string", label: "Mapped URN" },
    { key: "mappedUrnLabels", type: "object", label: "Mapped URN Labels" },
    { key: "id", type: "string", label: "Cohost ID" },
    { key: "data", type: "object", label: "Saved Object" },
    { key: "meta", type: "object", label: "Write Meta (action, changed)" },
  ],
  async execute(input, ctx) {
    if (!TYPES.includes(input.type)) throw new Error(`Type must be one of ${TYPES.join(", ")}.`);
    if (!isObject(input.data)) throw new Error("Data must be a JSON object.");
    const { mappedUrn, mappedUrnLabels, urn } = input;
    if (mappedUrn !== undefined && (typeof mappedUrn !== "string" || !mappedUrn)) {
      throw new Error("Mapped URN must be a URN string.");
    }
    if (mappedUrnLabels !== undefined && !isObject(mappedUrnLabels)) {
      throw new Error('Mapped URN Labels must be a JSON object, e.g. { "source": "eventbrite" }.');
    }
    if (!urn && !mappedUrn) throw new Error("Pass the Mapped URN (or a Cohost URN).");
    ctx.log("info", "syncing object", { type: input.type, mappedUrn, urn });
    return new CohostClient(ctx).request("/rms/sync", {
      method: "POST",
      body: {
        type: input.type,
        data: input.data,
        ...(mappedUrn ? { mappedUrn } : {}),
        ...(mappedUrnLabels ? { mappedUrnLabels } : {}),
        ...(urn ? { urn } : {}),
      },
    });
  },
};

export default syncObject;
