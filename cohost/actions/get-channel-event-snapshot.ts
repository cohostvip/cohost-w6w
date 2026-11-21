import type { ActionDefinition } from "@w6w/types";

export interface SnapshotInput {
  channelId: string;
  eventId: string;
  companyId: string;
  listingId?: string;
  mappingLabels?: Record<string, unknown>;
}

/** One `find-mapped-resources` result item. */
export type MappedResource = { urn: string; labels: Record<string, unknown>; meta: { implementation?: unknown } };

export interface ChannelEventSnapshot {
  channelId: string;
  eventId: string;
  companyId: string;
  eventUrn: string;
  listing: Record<string, unknown> | null;
  visibility: string | null;
  shown: boolean;
  channelEvent: Record<string, unknown> | null;
  channelTickets: Record<string, unknown>[];
  event: Record<string, unknown>;
  tickets: Record<string, unknown>[];
  mappings: { event: MappedResource[]; tickets: Record<string, MappedResource[]> };
}

/** One read: channel view + owner inventory + RMS mappings for one (channel, event). */
const getChannelEventSnapshot: ActionDefinition<SnapshotInput> = {
  key: "get-channel-event-snapshot",
  type: "read",
  resource: "channel",
  title: "Get Channel Event Snapshot",
  description:
    "Read an event on a sales channel in one call: the channel's view, the owner's inventory and any URN mappings.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "companyId", label: "Company ID", type: "string", required: true },
    { key: "listingId", label: "Listing ID", type: "string", required: false },
    {
      key: "mappingLabels", label: "Mapping labels", type: "json", required: false,
      hint: "Label filters for the mapping lookups; without them no mappings are read.",
    },
  ],
  output: [
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "eventUrn", type: "string", label: "Event URN" },
    { key: "listing", type: "object", label: "Listing" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "shown", type: "boolean", label: "Shown on the channel" },
    { key: "channelEvent", type: "object", label: "Channel view of the event" },
    { key: "channelTickets", type: "array", label: "Channel view of the tickets" },
    { key: "event", type: "object", label: "Owner event" },
    { key: "tickets", type: "array", label: "Owner tickets" },
    { key: "mappings", type: "object", label: "URN mappings (event, tickets by id)" },
  ],
  async execute() {
    throw new Error("not implemented");
  },
};

export default getChannelEventSnapshot;
