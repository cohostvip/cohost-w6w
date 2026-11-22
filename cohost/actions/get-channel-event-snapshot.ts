import type { ActionDefinition, HookContext } from "@w6w/types";
import { channelPath } from "../lib/channels.ts";
import { fetchChannelEvent, fetchChannelEventTickets, isCohostNotFound } from "../lib/channel-event.ts";
import { CohostClient } from "../lib/client.ts";
import findMappedResources from "./find-mapped-resources.ts";

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

const PAGE = 100;

type Rec = Record<string, unknown>;

/** Visibility of the event on the channel from the paged `status=started` listing; null when absent. */
async function lookupVisibility(ctx: HookContext, channelId: string, eventId: string): Promise<string | null> {
  const client = new CohostClient(ctx);
  for (let offset = 0;; offset += PAGE) {
    const page = await client.request<unknown>(channelPath(channelId, "events"), {
      query: { status: "started", limit: PAGE, offset },
    });
    const p = (page ?? {}) as Rec;
    const items = (Array.isArray(page) ? page : Array.isArray(p.items) ? p.items : Array.isArray(p.results) ? p.results : []) as Rec[];
    const hit = items.find(i => String(i.id) === eventId);
    if (hit) {
      const v = (hit.listing as Rec | undefined)?.visibility;
      return typeof v === "string" ? v : null;
    }
    const total = typeof p.total === "number" ? p.total : (p.pagination as Rec | undefined)?.total;
    if (items.length < PAGE || (typeof total === "number" && offset + PAGE >= total)) return null;
  }
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
  async execute(input, ctx): Promise<ChannelEventSnapshot> {
    const channelId = input.channelId.trim();
    const eventId = input.eventId.trim();
    const companyId = input.companyId.trim();
    const eventUrn = `urn:1:${companyId}:cohost-falcon:/events/${eventId}`;
    const client = new CohostClient(ctx);
    ctx.log("info", "reading channel event snapshot", { channelId, eventId });

    const listings = await client.request<Rec[]>(channelPath(channelId, "events", eventId, "listings"));
    const wanted = input.listingId?.trim();
    const all = Array.isArray(listings) ? listings : [];
    const listing =
      (wanted ? all.find(l => l.listingId === wanted) : undefined) ??
      all.find(l => l.listingId === "primary") ?? null;

    // Owner reads are deliberately not caught: a 403/404 is the cross-company negative.
    const event = await client.request<Rec>(`/events/${encodeURIComponent(eventId)}`);
    const tickets = await client.request<Rec[]>(`/events/${encodeURIComponent(eventId)}/tickets`, {
      query: { status: "all" }, // default is live only; removed/hidden/sold-out tickets must reach the snapshot
    });

    let shown = true;
    let channelEvent: Rec | null = null;
    let channelTickets: Rec[] = [];
    const ref = { channelId, eventId, listingId: wanted };
    try {
      const [ce, ct] = await Promise.all([fetchChannelEvent<Rec>(ctx, ref), fetchChannelEventTickets<Rec>(ctx, ref)]);
      channelEvent = ce;
      channelTickets = ct;
    } catch (error) {
      if (!isCohostNotFound(error)) throw error;
      shown = false;
    }

    let visibility: string | null = null;
    if (shown) visibility = "visible";
    else if (event.status === "started") visibility = await lookupVisibility(ctx, channelId, eventId);

    const mappings: ChannelEventSnapshot["mappings"] = { event: [], tickets: {} };
    if (input.mappingLabels) {
      const look = async (urn: string, kind: string) =>
        (await findMappedResources.execute({ urn, labels: { ...input.mappingLabels, kind } }, ctx) as {
          results: MappedResource[];
        }).results;
      mappings.event = await look(eventUrn, "event");
      const ids = new Set([...tickets, ...channelTickets].map(t => String(t.id)));
      for (const id of ids) {
        mappings.tickets[id] = await look(`${eventUrn}/tickets/${id}`, "ticket");
      }
    }

    return { channelId, eventId, companyId, eventUrn, listing, visibility, shown, channelEvent, channelTickets, event, tickets, mappings };
  },
};

export default getChannelEventSnapshot;
