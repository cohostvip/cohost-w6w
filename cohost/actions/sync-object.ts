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

/** A transformer's whole output: `{ type, urn, data }` (e.g. Eventbrite → Cohost). */
const isEnvelope = (value: Record<string, unknown>): value is { type: SyncType; urn: string; data: Record<string, unknown> } =>
  Object.keys(value).every((k) => k === "type" || k === "urn" || k === "data") &&
  TYPES.includes(value.type as SyncType) &&
  typeof value.urn === "string" && value.urn !== "" &&
  isObject(value.data);

/** Our own URNs (`cohost-falcon` / `cohost-puma`); any other service is a remote system. */
const isCohostUrn = (urn: string) => /^urn:1:[^:]+:cohost-(falcon|puma):/.test(urn);

/** The URN the object carries itself: `data.urn`, or `data.order.urn` for a `POST /v1/orders` body. */
const ownUrn = (data: Record<string, unknown>): string | undefined => {
  const urn = isObject(data.order) ? data.order.urn : data.urn;
  return typeof urn === "string" && urn ? urn : undefined;
};

/**
 * One step instead of a router: send any synced object as `data` with its `type`
 * and the remote URN it came from (e.g. a transformer's `urn`) as `mappedUrn`.
 * Cohost's `POST /v1/rms/sync` looks up the Cohost object that URN is mapped to and
 * updates it, or inserts the object and records the mapping (with `mappedUrnLabels`).
 * A ticket's or order's `data.event_urn` names its event. `urn` (ours) only forces a
 * specific Cohost object. One identity is required, so a retried step never duplicates.
 *
 * `data` may also be a transformer's whole output, `{ type, urn, data }`: it is unwrapped,
 * its `type` wins, and its `urn` is the Mapped URN. With no URN given at all, the object's
 * own `urn` (`data.order.urn` for an order body) is used — as the Cohost URN when it is
 * ours, as the Mapped URN otherwise.
 */
const syncObject: ActionDefinition<Input> = {
  key: "sync-object",
  type: "perform",
  resource: "urn",
  title: "Sync Object",
  description:
    "Insert or update a Cohost event, ticket or order. Pass a transformer's output as data (or the object, its type, and the remote URN it came from); Cohost updates the object that URN is mapped to, or inserts and maps it. Returns the saved object.",
  idempotent: true,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "event",
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
      hint: "The object to save, in Cohost's shape. A transformer's whole output ({ type, urn, data }) works as is: its type and urn are used, so Type and Mapped URN can stay as they are.",
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
    { key: "meta", type: "object", label: "Write Meta (action: create, update or unchanged; changed)" },
  ],
  async execute(input, ctx) {
    if (!isObject(input.data)) throw new Error("Data must be a JSON object.");
    const { mappedUrnLabels } = input;
    let { type, data, mappedUrn, urn } = input;
    if (mappedUrn !== undefined && mappedUrn !== "" && typeof mappedUrn !== "string") {
      throw new Error("Mapped URN must be a URN string.");
    }
    if (urn !== undefined && urn !== "" && typeof urn !== "string") throw new Error("Cohost URN must be a URN string.");
    if (isEnvelope(data)) {
      if (type !== data.type) ctx.log("info", "using the type of the transformer output", { type: data.type });
      type = data.type;
      if (!mappedUrn && !urn) mappedUrn = data.urn;
      data = data.data;
    }
    if (!TYPES.includes(type)) throw new Error(`Type must be one of ${TYPES.join(", ")}.`);
    if (mappedUrnLabels !== undefined && !isObject(mappedUrnLabels)) {
      throw new Error('Mapped URN Labels must be a JSON object, e.g. { "source": "eventbrite" }.');
    }
    if (!urn && !mappedUrn) {
      const own = ownUrn(data);
      if (own && isCohostUrn(own)) urn = own;
      else mappedUrn = own;
    }
    if (!urn && !mappedUrn) {
      throw new Error("No URN to sync by: pass a transformer's output as Data, or set the Mapped URN (or a Cohost URN).");
    }
    ctx.log("info", "syncing object", { type, mappedUrn, urn });
    return new CohostClient(ctx).request("/rms/sync", {
      method: "POST",
      body: {
        type,
        data,
        ...(mappedUrn ? { mappedUrn } : {}),
        ...(mappedUrnLabels ? { mappedUrnLabels } : {}),
        ...(urn ? { urn } : {}),
      },
    });
  },
};

export default syncObject;
