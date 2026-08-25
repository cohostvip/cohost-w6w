/**
 * Minimal structural types for the Cohost resources these actions touch.
 *
 * Deliberately loose: the app has no dependency on `@cohostvip/cohost-types`,
 * and it only needs enough shape to unwrap responses safely. The authoritative
 * field list lives in `.claude/docs/SDK_ENDPOINTS.md` and, upstream, in
 * `@cohostvip/cohost-types`.
 */

export interface Ticket {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Attendee {
  id: string;
  orderId: string;
  [key: string]: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  [key: string]: unknown;
}

export interface Organizer {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface ContentBlock {
  id: string;
  type: string;
  order: number;
  [key: string]: unknown;
}
