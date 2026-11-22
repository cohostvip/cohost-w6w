import type { ActionDefinition } from "@w6w/types";
import { channelIdParam, resolveChannelFields } from "../lib/channels.ts";
import { CohostClient } from "../lib/client.ts";
import { resourceId } from "../lib/resource-id.ts";

interface Input {
  channelId: string;
  event: string;
  formulaId?: string;
  tickets?: string;
  listingId?: string;
}

interface Pricing {
  markupPercent?: number;
  prices?: Record<string, string>;
  formulaId?: string;
  formulas?: Record<string, string>;
}

interface CustomizationView {
  listingId?: string;
  customization: ({ pricing?: Pricing; fees?: unknown[] } & Record<string, unknown>) | null;
}

/** "tkt_1, tkt_2\ntkt_3" → unique ids; ticket URNs are accepted. */
const ticketIds = (value: string | undefined): string[] => [
  ...new Set(
    (value ?? "").split(/[\s,]+/).map((part) => part.trim()).filter(Boolean).map((part) =>
      part.startsWith("urn:") ? part.split("/").pop() ?? part : part
    ),
  ),
];

/**
 * GET + PUT /events/{event}/channels/{channelId}/customization — price tickets of an event on a
 * channel by one of your price formulas: the tickets named (their own price on the channel is
 * dropped, since a set price wins over a formula), or with no tickets named the whole listing
 * (every ticket without its own price or formula). A blank formula removes it from those tickets
 * or the listing. The rest of the listing's customization is kept. Event owner only.
 */
const assignPriceFormula: ActionDefinition<Input> = {
  key: "assign-price-formula",
  type: "perform",
  resource: "price-formula",
  title: "Assign Price Formula",
  description: "Price an event's tickets on a sales channel by one of your price formulas.",
  idempotent: true,
  params: [
    channelIdParam({ required: true }),
    { key: "event", label: "Event (ID or URN)", type: "string", required: true },
    {
      key: "formulaId",
      label: "Formula ID",
      type: "string",
      hint: "Blank removes the formula from the tickets (or the listing), which fall back to the listing's pricing.",
    },
    {
      key: "tickets",
      label: "Ticket IDs",
      type: "text",
      hint: "Comma or line separated, e.g. the GA and fast pass tickets. Blank sets the formula for the whole listing.",
    },
    {
      key: "listingId",
      label: "Listing ID",
      type: "string",
      default: "primary",
      hint: "primary, or an extra listing's id (meta.listingId on Channel Event Changed).",
    },
  ],
  output: [
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "listingId", type: "string", label: "Listing ID" },
    { key: "pricing.formulaId", type: "string", label: "The listing's formula" },
    { key: "pricing.formulas", type: "object", label: "Ticket ID → formula" },
    { key: "pricing.prices", type: "object", label: "Ticket ID → own channel price" },
    { key: "pricing.markupPercent", type: "number", label: "Markup %" },
  ],

  resolveFields: resolveChannelFields,

  async execute(input, ctx) {
    const eventId = resourceId(input.event.trim(), "events");
    const channelId = input.channelId.trim();
    const listingId = input.listingId?.trim() || "primary";
    const formulaId = input.formulaId?.trim() || undefined;
    const tickets = ticketIds(input.tickets);
    const path = `/events/${encodeURIComponent(eventId)}/channels/${encodeURIComponent(channelId)}/customization`;
    const query = listingId === "primary" ? undefined : { listingId };
    const client = new CohostClient(ctx);

    const view = await client.request<CustomizationView>(path, { query });
    const current = view.customization ?? {};
    const pricing: Pricing = { ...(current.pricing ?? {}) };
    const prices = { ...(pricing.prices ?? {}) };
    const formulas = { ...(pricing.formulas ?? {}) };

    if (tickets.length === 0) {
      if (formulaId) pricing.formulaId = formulaId;
      else delete pricing.formulaId;
    } else {
      for (const ticketId of tickets) {
        if (formulaId) {
          formulas[ticketId] = formulaId;
          delete prices[ticketId];
        } else {
          delete formulas[ticketId];
        }
      }
    }

    ctx.log("info", "assigning price formula", { eventId, channelId, listingId, formulaId, tickets: tickets.length });
    const saved = await client.request<CustomizationView>(path, {
      method: "PUT",
      query,
      body: { customization: { ...current, fees: current.fees ?? [], pricing: { ...pricing, prices, formulas } } },
    });
    return { eventId, channelId, listingId: saved.listingId ?? listingId, pricing: saved.customization?.pricing ?? null };
  },
};

export default assignPriceFormula;
