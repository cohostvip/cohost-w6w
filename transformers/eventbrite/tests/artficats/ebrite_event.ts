/**
 * Synthetic Eventbrite API data. All identities, URLs, copy, dates, prices,
 * and inventory are fictional; the detailed response fields are retained.
 */
const eventFixture = {
  "name": {
    "text": "Example Community Festival",
    "html": "Example Community Festival"
  },
  "description": {
    "text": "A fictional festival with workshops, music & games.",
    "html": "A fictional festival with workshops, music &amp; games."
  },
  "url": "https://www.example.com/e/example-community-festival-1000000000001",
  "start": {
    "timezone": "America/New_York",
    "utc": "2030-06-15T14:00:00Z",
    "local": "2030-06-15T10:00:00"
  },
  "end": {
    "timezone": "America/New_York",
    "utc": "2030-06-15T22:00:00Z",
    "local": "2030-06-15T18:00:00"
  },
  "organization_id": "2000000000001",
  "created": "2030-01-01T12:00:00Z",
  "changed": "2030-06-16T12:00:00Z",
  "published": "2030-01-02T12:00:00Z",
  "capacity": 420,
  "capacity_is_custom": false,
  "status": "completed",
  "currency": "USD",
  "listed": true,
  "shareable": true,
  "invite_only": false,
  "online_event": false,
  "show_remaining": false,
  "tx_time_limit": 1200,
  "hide_start_date": false,
  "hide_end_date": false,
  "locale": "en_US",
  "is_locked": false,
  "privacy_setting": "unlocked",
  "is_series": false,
  "is_series_parent": false,
  "inventory_type": "limited",
  "is_reserved_seating": false,
  "show_pick_a_seat": false,
  "show_seatmap_thumbnail": false,
  "show_colors_in_seatmap_thumbnail": false,
  "source": "api",
  "is_free": false,
  "version": null,
  "summary": "A fictional festival with workshops, music & games.",
  "facebook_event_id": null,
  "logo_id": "4000000000001",
  "organizer_id": "3000000000001",
  "venue_id": null,
  "category_id": null,
  "subcategory_id": null,
  "format_id": null,
  "id": "1000000000001",
  "resource_uri": "https://api.example.com/v3/events/1000000000001/",
  "is_externally_ticketed": false,
  "logo": {
    "crop_mask": null,
    "original": {
      "url": "https://images.example.com/festival/original.png",
      "width": 1600,
      "height": 800
    },
    "id": "4000000000001",
    "url": "https://images.example.com/festival/thumbnail.png",
    "aspect_ratio": "2",
    "edge_color": "#eeeeee",
    "edge_color_set": true
  },
  "venue": null,
  "ticket_classes": [
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$2.00",
        "currency": "USD",
        "value": 200,
        "major_value": "2.00"
      },
      "cost": {
        "display": "$25.00",
        "currency": "USD",
        "value": 2500,
        "major_value": "25.00"
      },
      "fee": {
        "display": "$2.00",
        "currency": "USD",
        "value": 200,
        "major_value": "2.00"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000001/",
      "display_name": "Priority Admission",
      "name": "Priority Admission",
      "description": "Priority Admission for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 1,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000001",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 0,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": false,
      "hidden_currently": false,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$2.25",
        "currency": "USD",
        "value": 225,
        "major_value": "2.25"
      },
      "cost": {
        "display": "$40.00",
        "currency": "USD",
        "value": 4000,
        "major_value": "40.00"
      },
      "fee": {
        "display": "$2.25",
        "currency": "USD",
        "value": 225,
        "major_value": "2.25"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000002/",
      "display_name": "Weekend Pass",
      "name": "Weekend Pass",
      "description": "Weekend Pass for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 2,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000002",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 0,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": false,
      "hidden_currently": false,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$2.50",
        "currency": "USD",
        "value": 250,
        "major_value": "2.50"
      },
      "cost": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "fee": {
        "display": "$2.50",
        "currency": "USD",
        "value": 250,
        "major_value": "2.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000003/",
      "display_name": "Presale Admission",
      "name": "Presale Admission",
      "description": "Presale Admission for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 3,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "SOLD_OUT",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000003",
      "capacity": 20,
      "quantity_total": 20,
      "quantity_sold": 20,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": true,
      "hidden_currently": true,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "cost": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000004/",
      "display_name": "General Admission",
      "name": "General Admission",
      "description": "General Admission for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 4,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000004",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 5,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": false,
      "hidden_currently": false,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$3.00",
        "currency": "USD",
        "value": 300,
        "major_value": "3.00"
      },
      "cost": {
        "display": "$45.00",
        "currency": "USD",
        "value": 4500,
        "major_value": "45.00"
      },
      "fee": {
        "display": "$3.00",
        "currency": "USD",
        "value": 300,
        "major_value": "3.00"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000005/",
      "display_name": "Workshop Bundle",
      "name": "Workshop Bundle",
      "description": "Workshop Bundle for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 5,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000005",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 0,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": true,
      "hidden_currently": true,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "cost": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000006/",
      "display_name": "Early Bird Admission",
      "name": "Early Bird Admission",
      "description": "Early Bird Admission for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 6,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000006",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 5,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": false,
      "hidden_currently": false,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$3.50",
        "currency": "USD",
        "value": 350,
        "major_value": "3.50"
      },
      "cost": {
        "display": "$15.00",
        "currency": "USD",
        "value": 1500,
        "major_value": "15.00"
      },
      "fee": {
        "display": "$3.50",
        "currency": "USD",
        "value": 350,
        "major_value": "3.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000007/",
      "display_name": "Group Admission",
      "name": "Group Admission",
      "description": "Group Admission for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 7,
      "donation": false,
      "free": false,
      "minimum_quantity": 4,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000007",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 0,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": false,
      "hidden_currently": false,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$3.75",
        "currency": "USD",
        "value": 375,
        "major_value": "3.75"
      },
      "cost": {
        "display": "$60.00",
        "currency": "USD",
        "value": 6000,
        "major_value": "60.00"
      },
      "fee": {
        "display": "$3.75",
        "currency": "USD",
        "value": 375,
        "major_value": "3.75"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000008/",
      "display_name": "Premium Bundle",
      "name": "Premium Bundle",
      "description": "Premium Bundle for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 8,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000008",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 0,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": true,
      "hidden_currently": true,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    },
    {
      "actual_cost": null,
      "actual_fee": {
        "display": "$4.00",
        "currency": "USD",
        "value": 400,
        "major_value": "4.00"
      },
      "cost": {
        "display": "$75.00",
        "currency": "USD",
        "value": 7500,
        "major_value": "75.00"
      },
      "fee": {
        "display": "$4.00",
        "currency": "USD",
        "value": 400,
        "major_value": "4.00"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "resource_uri": "https://api.example.com/v3/events/1000000000001/ticket_classes/5000000000009/",
      "display_name": "All Access Pass",
      "name": "All Access Pass",
      "description": "All Access Pass for the fictional Example Community Festival.\nFor test use only.",
      "sorting": 9,
      "donation": false,
      "free": false,
      "minimum_quantity": 1,
      "maximum_quantity": 10,
      "maximum_quantity_per_order": 0,
      "on_sale_status": "UNAVAILABLE",
      "has_pdf_ticket": true,
      "order_confirmation_message": null,
      "delivery_methods": [
        "electronic"
      ],
      "category": "admission",
      "sales_channels": [
        "online",
        "atd"
      ],
      "secondary_assignment_enabled": false,
      "event_id": "1000000000001",
      "image_id": null,
      "id": "5000000000009",
      "capacity": 50,
      "quantity_total": 50,
      "quantity_sold": 0,
      "quantity_pending": 0,
      "sales_start": "2030-01-02T12:00:00Z",
      "sales_end": "2030-06-15T14:00:00Z",
      "sales_end_relative": null,
      "hidden": false,
      "hidden_currently": false,
      "include_fee": false,
      "split_fee": false,
      "hide_description": true,
      "hide_sale_dates": false,
      "early_access_purchase_windows": false,
      "ticket_parent_id": null,
      "auto_hide": false,
      "payment_constraints": []
    }
  ]
};

export type EventbriteExpandedEventFixture = typeof eventFixture;
export type EventbriteEventFixture = Omit<EventbriteExpandedEventFixture, "ticket_classes">;
export type EventbriteTicketClassFixture = EventbriteExpandedEventFixture["ticket_classes"][number];

function pagination(objectCount: number) {
  return {
    object_count: objectCount,
    page_number: 1,
    page_size: 50,
    page_count: 1,
    continuation: null,
    has_more_items: false,
  };
}

export type EventbriteListingFixture = {
  events: EventbriteExpandedEventFixture[];
  pagination: ReturnType<typeof pagination>;
};

export type EventbriteTicketClassListingFixture = {
  ticket_classes: EventbriteTicketClassFixture[];
  pagination: ReturnType<typeof pagination>;
};

export type EventbriteFixtureOptions =
  | { type?: "listing" }
  | { type: "event" }
  | { type: "expanded_event" }
  | { type: "ticket_class"; ticketClassIndex?: number }
  | { type: "ticket_classes" }
  | { type: "ticket_class_listing" };

type EventbriteFixtureResult =
  | EventbriteListingFixture
  | EventbriteEventFixture
  | EventbriteExpandedEventFixture
  | EventbriteTicketClassFixture
  | EventbriteTicketClassFixture[]
  | EventbriteTicketClassListingFixture;

/**
 * Return a fresh, independently mutable fixture on every call.
 *
 * @example
 * createEventbriteFixture(); // { events: [expandedEvent], pagination }
 * createEventbriteFixture({ type: "event" }); // event without ticket_classes
 * createEventbriteFixture({ type: "expanded_event" }); // event with ticket_classes
 * createEventbriteFixture({ type: "ticket_class", ticketClassIndex: 2 }); // sold-out ticket
 * createEventbriteFixture({ type: "ticket_classes" }); // all ticket classes as an array
 * createEventbriteFixture({ type: "ticket_class_listing" }); // { ticket_classes, pagination }
 */
export function createEventbriteFixture(options?: { type?: "listing" }): EventbriteListingFixture;
export function createEventbriteFixture(options: { type: "event" }): EventbriteEventFixture;
export function createEventbriteFixture(options: { type: "expanded_event" }): EventbriteExpandedEventFixture;
export function createEventbriteFixture(options: { type: "ticket_class"; ticketClassIndex?: number }): EventbriteTicketClassFixture;
export function createEventbriteFixture(options: { type: "ticket_classes" }): EventbriteTicketClassFixture[];
export function createEventbriteFixture(options: { type: "ticket_class_listing" }): EventbriteTicketClassListingFixture;
export function createEventbriteFixture(options: EventbriteFixtureOptions): EventbriteFixtureResult;
export function createEventbriteFixture(options: EventbriteFixtureOptions = {}): EventbriteFixtureResult {
  const event = structuredClone(eventFixture);

  switch (options.type) {
    case "event": {
      const { ticket_classes, ...eventOnly } = event;
      return eventOnly;
    }
    case "expanded_event":
      return event;
    case "ticket_class": {
      const index = options.ticketClassIndex ?? 0;
      if (!Number.isInteger(index) || index < 0 || index >= event.ticket_classes.length) {
        throw new RangeError(`ticketClassIndex must be an integer from 0 to ${event.ticket_classes.length - 1}`);
      }
      return event.ticket_classes[index];
    }
    case "ticket_classes":
      return event.ticket_classes;
    case "ticket_class_listing":
      return { ticket_classes: event.ticket_classes, pagination: pagination(event.ticket_classes.length) };
    case "listing":
    case undefined:
      return { events: [event], pagination: pagination(1) };
  }
}
