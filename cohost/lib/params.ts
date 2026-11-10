/**
 * Shared param/output fragments.
 *
 * The Cohost list endpoints paginate with 1-based `page` + `size` (offset pagination —
 * no endpoint issues a continuation cursor). `/search` speaks `limit` / `offset`;
 * `search-events` maps `page` / `size` onto it so every list action takes the same
 * inputs and returns the same `pagination` shape.
 */
import type { OutputField, Param } from "@w6w/types";

/** `page` / `size` — the platform-standard dialect. */
export const paginationParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "1-based page number.",
    validation: { integer: true, min: 1 },
  },
  {
    key: "size",
    label: "Page Size",
    type: "number",
    hint: "Results per page.",
    validation: { integer: true, min: 1 },
  },
];

/** Input shape contributed by {@link paginationParams}. */
export interface PaginationInput {
  page?: number;
  size?: number;
}

/** Page size sent when a caller picks a page but no size — the API's own default. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Project {@link PaginationInput} onto the query string the API expects. A `page` without
 * a `size` gets {@link DEFAULT_PAGE_SIZE}: some endpoints (event attendees) only paginate
 * when a size is present, and would otherwise return every row for any page.
 */
export const paginationQuery = (input: PaginationInput) => ({
  page: input.page,
  size: input.size ?? (input.page === undefined ? undefined : DEFAULT_PAGE_SIZE),
});

/** Output of a `page`/`size` paginated list, post envelope-unwrap. */
export const paginatedOutput = (label: string): OutputField[] => [
  { key: "results", type: "array", label },
  { key: "pagination.page", type: "number", label: "Page" },
  { key: "pagination.size", type: "number", label: "Page Size" },
  { key: "pagination.total", type: "number", label: "Total" },
];

/** `?context=` free-form passthrough accepted by every event/ticket write. */
export const contextParam: Param = {
  key: "context",
  label: "Context",
  type: "json",
  hint: "Optional free-form context object forwarded verbatim to the API.",
};

/** The event/organizer/order resource fields worth surfacing for editor autocomplete. */
export const eventOutput: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "summary", type: "string", label: "Summary" },
  { key: "status", type: "string", label: "Status" },
  { key: "start", type: "string", label: "Start" },
  { key: "end", type: "string", label: "End" },
  { key: "tz", type: "string", label: "Timezone" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "public", type: "boolean", label: "Public" },
  { key: "capacity", type: "number", label: "Capacity" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "organizerId", type: "string", label: "Organizer ID" },
  { key: "location", type: "object", label: "Location" },
  { key: "flyer", type: "object", label: "Flyer" },
];

export const ticketOutput: OutputField[] = [
  { key: "id", type: "string", label: "Ticket ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "category", type: "string", label: "Category" },
  { key: "status", type: "string", label: "Status" },
  { key: "priceCategory", type: "string", label: "Price Category" },
  { key: "capacity", type: "number", label: "Capacity" },
  { key: "quantitySold", type: "number", label: "Quantity Sold" },
  { key: "minimumQuantity", type: "number", label: "Minimum Quantity" },
  { key: "maximumQuantity", type: "number", label: "Maximum Quantity" },
  { key: "sorting", type: "number", label: "Sorting" },
];

export const orderOutput: OutputField[] = [
  { key: "id", type: "string", label: "Order ID" },
  { key: "orderNumber", type: "string", label: "Order Number" },
  { key: "status", type: "string", label: "Status" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "organizerId", type: "string", label: "Organizer ID" },
  { key: "customer", type: "object", label: "Customer" },
  { key: "items", type: "array", label: "Items" },
  { key: "costs", type: "object", label: "Costs" },
];

export const couponOutput: OutputField[] = [
  { key: "id", type: "string", label: "Coupon ID" },
  { key: "code", type: "string", label: "Code" },
  { key: "discountType", type: "string", label: "Discount Type" },
  { key: "discountValue", type: "number", label: "Discount Value" },
  { key: "maxUses", type: "number", label: "Max Uses" },
  { key: "usedCount", type: "number", label: "Used Count" },
  { key: "expiresAt", type: "string", label: "Expires At" },
  { key: "status", type: "string", label: "Status" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "companyId", type: "string", label: "Company ID" },
];

export const organizerOutput: OutputField[] = [
  { key: "id", type: "string", label: "Organizer ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "headline", type: "string", label: "Headline" },
  { key: "bio", type: "string", label: "Bio" },
  { key: "followers", type: "number", label: "Followers" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "logo", type: "object", label: "Logo" },
  { key: "links", type: "array", label: "Links" },
  { key: "settings", type: "object", label: "Settings" },
];

export const attendeeOutput: OutputField[] = [
  { key: "id", type: "string", label: "Attendee ID" },
  { key: "orderId", type: "string", label: "Order ID" },
  { key: "orderNumber", type: "string", label: "Order Number" },
  { key: "offeringId", type: "string", label: "Offering ID" },
  { key: "orderItemId", type: "string", label: "Order Item ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "checkedIn", type: "boolean", label: "Checked In" },
  { key: "profile", type: "object", label: "Profile" },
  { key: "barcodes", type: "array", label: "Barcodes" },
];
