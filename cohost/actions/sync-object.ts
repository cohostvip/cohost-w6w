import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";

type SyncType = "event" | "ticket" | "order";

interface Input {
  type: SyncType;
  data: Record<string, unknown>;
  urn?: string;
  mappedUrn?: { urn: string; labels?: Record<string, unknown> };
  eventId?: string;
}

const TYPES: SyncType[] = ["event", "ticket", "order"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * One step instead of a router: send any synced object as `data` with its `type`,
 * and Cohost's `POST /v1/rms/sync` dispatches it to the event, ticket or order
 * upsert. `urn` (ours) updates an existing Cohost object; `mappedUrn` (the remote
 * URN + labels) updates whatever it is mapped to, or inserts the object and records
 * the mapping. Either one is required, so a retried step never duplicates.
 */
const syncObject: ActionDefinition<Input> = {
  key: "sync-object",
  type: "perform",
  resource: "urn",
  title: "Sync Object",
  description:
    "Insert or update a Cohost event, ticket or order by URN. Pass the converted object as data, its type, and our Cohost URN and/or the remote URN it maps to; returns the saved object.",
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
      key: "urn",
      label: "Cohost URN",
      type: "string",
      required: false,
      hint: "Our URN when the object already exists in Cohost, e.g. urn:1:<company>:cohost-falcon:/events/<id>.",
    },
    {
      key: "mappedUrn",
      label: "Mapped URN",
      type: "json",
      required: false,
      hint: 'The remote resource: { "urn": "urn:1:<company>:conn_…:/events/<id>", "labels": { … } }. Labels are merged onto the mapping and searchable with Find Mapped Resources.',
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: false,
      hint: "Tickets only: the Cohost event id. Defaults to the event the ticket's (or its parent event's) URN is mapped to.",
    },
  ],
  output: [
    { key: "type", type: "string", label: "Type" },
    { key: "urn", type: "string", label: "Cohost URN" },
    { key: "mappedUrn", type: "object", label: "Mapped URN" },
    { key: "id", type: "string", label: "Cohost ID" },
    { key: "data", type: "object", label: "Saved Object" },
    { key: "meta", type: "object", label: "Write Meta (action, changed)" },
  ],
  async execute(input, ctx) {
    if (!TYPES.includes(input.type)) throw new Error(`Type must be one of ${TYPES.join(", ")}.`);
    if (!isObject(input.data)) throw new Error("Data must be a JSON object.");
    const mapped = input.mappedUrn;
    if (mapped !== undefined && (!isObject(mapped) || typeof mapped.urn !== "string" || !mapped.urn)) {
      throw new Error('Mapped URN must be { "urn": "…", "labels"?: { … } }.');
    }
    if (!input.urn && !mapped) throw new Error("Pass the Cohost URN, the mapped URN, or both.");
    ctx.log("info", "syncing object", { type: input.type, urn: input.urn, mappedUrn: mapped?.urn });
    return new CohostClient(ctx).request("/rms/sync", {
      method: "POST",
      body: {
        type: input.type,
        data: input.data,
        ...(input.urn ? { urn: input.urn } : {}),
        ...(mapped ? { mappedUrn: mapped } : {}),
        ...(input.eventId ? { eventId: input.eventId } : {}),
      },
    });
  },
};

export default syncObject;
