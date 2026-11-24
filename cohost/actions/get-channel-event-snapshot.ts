import type { ActionDefinition, HookContext, Param } from "@w6w/types";
import { channelPath } from "../lib/channels.ts";
import { fetchChannelEvent, fetchChannelEventTickets, isCohostNotFound } from "../lib/channel-event.ts";
import { CohostClient } from "../lib/client.ts";
import { type MappedResource, searchMappedResources } from "../lib/rms.ts";

export interface SnapshotInput {
  channelId: string;
  eventId: string;
  companyId?: string;
  listingId?: string;
  mappingLabels?: Record<string, unknown>;
}

export type { MappedResource };

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

/** Hidden: the account's own company (const), exactly as the Eventbrite transformer does it. */
const companyIdParam: Param & { hidden: boolean } = {
  key: "companyId", label: "Company ID", type: "string", required: true, hidden: true,
  default: "{{ const.account_id }}",
  hint: "The account's company; the owner event's own company wins when it reports one.",
};

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

/**
 * The event's and tickets' mappings matching `mappingLabels` — one batch search for all of them.
 * `kind` (event / ticket) is matched here rather than in the search, so both fit in one request.
 */
async function readMappings(
  ctx: HookContext,
  eventUrn: string,
  ticketIds: string[],
  mappingLabels: Record<string, unknown> | undefined,
): Promise<ChannelEventSnapshot["mappings"]> {
  if (!mappingLabels) return { event: [], tickets: {} };
  const { kind: _kind, ...labels } = mappingLabels;
  const ids = [...new Set(ticketIds)];
  const ticketUrn = (id: string) => `${eventUrn}/tickets/${id}`;
  const found = await searchMappedResources(ctx, [eventUrn, ...ids.map(ticketUrn)], labels);
  const ofKind = (urn: string, kind: string) => (found[urn] ?? []).filter(r => r.labels?.kind === kind);
  return {
    event: ofKind(eventUrn, "event"),
    tickets: Object.fromEntries(ids.map(id => [id, ofKind(ticketUrn(id), "ticket")])),
  };
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
    companyIdParam,
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
    const client = new CohostClient(ctx);
    ctx.log("info", "reading channel event snapshot", { channelId, eventId });

    const wanted = input.listingId?.trim();
    const ref = { channelId, eventId, listingId: wanted };
    const eventPath = `/events/${encodeURIComponent(eventId)}`;
    // Stage 1 — every read that needs only the ids, at once. Owner reads are deliberately not
    // caught: a 403/404 is the cross-company negative. The channel view's 404 means "not shown".
    const [listings, event, tickets, view] = await Promise.all([
      client.request<Rec[]>(channelPath(channelId, "events", eventId, "listings")),
      client.request<Rec>(eventPath),
      // default is live only; removed/hidden/sold-out tickets must reach the snapshot
      client.request<Rec[]>(`${eventPath}/tickets`, { query: { status: "all" } }),
      Promise.all([fetchChannelEvent<Rec>(ctx, ref), fetchChannelEventTickets<Rec>(ctx, ref)]).then(
        ([channelEvent, channelTickets]) => ({ shown: true, channelEvent: channelEvent as Rec | null, channelTickets }),
        (error: unknown) => {
          if (!isCohostNotFound(error)) throw error;
          return { shown: false, channelEvent: null, channelTickets: [] as Rec[] };
        },
      ),
    ]);
    const all = Array.isArray(listings) ? listings : [];
    const listing =
      (wanted ? all.find(l => l.listingId === wanted) : undefined) ??
      all.find(l => l.listingId === "primary") ?? null;
    const { shown, channelEvent, channelTickets } = view;

    // URNs are named under the company that owns the event (a channel may sell another organizer's event).
    const owner = typeof event.companyId === "string" && event.companyId.trim() ? event.companyId.trim() : undefined;
    const companyId = owner ?? (typeof input.companyId === "string" ? input.companyId.trim() : "");
    if (!companyId) throw new Error("companyId is required (the account's company) when the event reports none");
    const eventUrn = `urn:1:${companyId}:cohost-falcon:/events/${eventId}`;

    // Stage 2 — the mappings of the event and of EVERY ticket (owner ∪ channel: a ticket that left
    // the channel must still be found to be retired) in one search, beside the visibility lookup.
    const [mappings, visibility] = await Promise.all([
      readMappings(ctx, eventUrn, [...tickets, ...channelTickets].map(t => String(t.id)), input.mappingLabels),
      shown ? "visible" : event.status === "started" ? lookupVisibility(ctx, channelId, eventId) : null,
    ]);

    return { channelId, eventId, companyId, eventUrn, listing, visibility, shown, channelEvent, channelTickets, event, tickets, mappings };
  },
};

export default getChannelEventSnapshot;
