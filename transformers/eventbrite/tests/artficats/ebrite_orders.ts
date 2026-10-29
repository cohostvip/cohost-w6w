/**
 * Synthetic Eventbrite orders. Buyer identities, barcodes, URLs, dates, and
 * amounts are fictional. Event and ticket class IDs match ebrite_event.ts.
 *
 * Preserve the source API's fee distinction: order display_tax holds the tax
 * on service fees, while attendee eventbrite_fee includes that tax.
 */
const ordersFixture = [
  {
    "costs": {
      "base_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_fee": {
        "display": "$2.50",
        "currency": "USD",
        "value": 250,
        "major_value": "2.50"
      },
      "display_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "eventbrite_fee": {
        "display": "$2.00",
        "currency": "USD",
        "value": 200,
        "major_value": "2.00"
      },
      "gross": {
        "display": "$8.00",
        "currency": "USD",
        "value": 800,
        "major_value": "8.00"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.50",
          "currency": "USD",
          "value": 50,
          "major_value": "0.50"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 200,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 50,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000001/",
    "id": "6000000000001",
    "changed": "2030-02-01T12:01:00Z",
    "created": "2030-02-01T12:00:00Z",
    "name": "Example Buyer01",
    "first_name": "Example",
    "last_name": "Buyer01",
    "email": "buyer01@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000001/",
        "id": "7000000000001",
        "changed": "2030-02-01T12:01:00Z",
        "created": "2030-02-01T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer01",
          "first_name": "Example",
          "last_name": "Buyer01",
          "email": "buyer01@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000001-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-01T12:00:00Z",
            "changed": "2030-02-01T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000001",
        "ticket_class_id": "5000000000003"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_fee": {
        "display": "$2.50",
        "currency": "USD",
        "value": 250,
        "major_value": "2.50"
      },
      "display_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "eventbrite_fee": {
        "display": "$2.00",
        "currency": "USD",
        "value": 200,
        "major_value": "2.00"
      },
      "gross": {
        "display": "$8.00",
        "currency": "USD",
        "value": 800,
        "major_value": "8.00"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.50",
          "currency": "USD",
          "value": 50,
          "major_value": "0.50"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 200,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 50,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000002/",
    "id": "6000000000002",
    "changed": "2030-02-02T12:01:00Z",
    "created": "2030-02-02T12:00:00Z",
    "name": "Example Buyer02",
    "first_name": "Example",
    "last_name": "Buyer02",
    "email": "buyer02@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000002/",
        "id": "7000000000002",
        "changed": "2030-02-02T12:01:00Z",
        "created": "2030-02-02T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer02",
          "first_name": "Example",
          "last_name": "Buyer02",
          "email": "buyer02@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000002-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-02T12:00:00Z",
            "changed": "2030-02-02T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000002",
        "ticket_class_id": "5000000000003"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_fee": {
        "display": "$2.50",
        "currency": "USD",
        "value": 250,
        "major_value": "2.50"
      },
      "display_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "eventbrite_fee": {
        "display": "$2.00",
        "currency": "USD",
        "value": 200,
        "major_value": "2.00"
      },
      "gross": {
        "display": "$8.00",
        "currency": "USD",
        "value": 800,
        "major_value": "8.00"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.50",
          "currency": "USD",
          "value": 50,
          "major_value": "0.50"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 200,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 50,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000003/",
    "id": "6000000000003",
    "changed": "2030-02-03T12:01:00Z",
    "created": "2030-02-03T12:00:00Z",
    "name": "Example Buyer03",
    "first_name": "Example",
    "last_name": "Buyer03",
    "email": "buyer03@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000003/",
        "id": "7000000000003",
        "changed": "2030-02-03T12:01:00Z",
        "created": "2030-02-03T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer03",
          "first_name": "Example",
          "last_name": "Buyer03",
          "email": "buyer03@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000003-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-03T12:00:00Z",
            "changed": "2030-02-03T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000003",
        "ticket_class_id": "5000000000003"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_fee": {
        "display": "$2.50",
        "currency": "USD",
        "value": 250,
        "major_value": "2.50"
      },
      "display_price": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "eventbrite_fee": {
        "display": "$2.00",
        "currency": "USD",
        "value": 200,
        "major_value": "2.00"
      },
      "gross": {
        "display": "$8.00",
        "currency": "USD",
        "value": 800,
        "major_value": "8.00"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$5.00",
        "currency": "USD",
        "value": 500,
        "major_value": "5.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.50",
          "currency": "USD",
          "value": 50,
          "major_value": "0.50"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 200,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 50,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000004/",
    "id": "6000000000004",
    "changed": "2030-02-04T12:01:00Z",
    "created": "2030-02-04T12:00:00Z",
    "name": "Example Buyer04",
    "first_name": "Example",
    "last_name": "Buyer04",
    "email": "buyer04@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000004/",
        "id": "7000000000004",
        "changed": "2030-02-04T12:01:00Z",
        "created": "2030-02-04T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer04",
          "first_name": "Example",
          "last_name": "Buyer04",
          "email": "buyer04@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000004-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-04T12:00:00Z",
            "changed": "2030-02-04T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000004",
        "ticket_class_id": "5000000000003"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "display_fee": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_price": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "eventbrite_fee": {
        "display": "$8.00",
        "currency": "USD",
        "value": 800,
        "major_value": "8.00"
      },
      "gross": {
        "display": "$32.00",
        "currency": "USD",
        "value": 3200,
        "major_value": "32.00"
      },
      "payment_fee": {
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
      "price_before_discount": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$2.00",
          "currency": "USD",
          "value": 200,
          "major_value": "2.00"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 800,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 200,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 200,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000005/",
    "id": "6000000000005",
    "changed": "2030-02-05T12:01:00Z",
    "created": "2030-02-05T12:00:00Z",
    "name": "Example Buyer05",
    "first_name": "Example",
    "last_name": "Buyer05",
    "email": "buyer05@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000005/",
        "id": "7000000000005",
        "changed": "2030-02-05T12:01:00Z",
        "created": "2030-02-05T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer05",
          "first_name": "Example",
          "last_name": "Buyer05",
          "email": "buyer05@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000005-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-05T12:00:00Z",
            "changed": "2030-02-05T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000005",
        "ticket_class_id": "5000000000003"
      },
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000006/",
        "id": "7000000000006",
        "changed": "2030-02-05T12:01:00Z",
        "created": "2030-02-05T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer05",
          "first_name": "Example",
          "last_name": "Buyer05",
          "email": "buyer05@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000006-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-05T12:00:00Z",
            "changed": "2030-02-05T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000005",
        "ticket_class_id": "5000000000003"
      },
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000007/",
        "id": "7000000000007",
        "changed": "2030-02-05T12:01:00Z",
        "created": "2030-02-05T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer05",
          "first_name": "Example",
          "last_name": "Buyer05",
          "email": "buyer05@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000007-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-05T12:00:00Z",
            "changed": "2030-02-05T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000005",
        "ticket_class_id": "5000000000003"
      },
      {
        "costs": {
          "base_price": {
            "display": "$5.00",
            "currency": "USD",
            "value": 500,
            "major_value": "5.00"
          },
          "eventbrite_fee": {
            "display": "$2.50",
            "currency": "USD",
            "value": 250,
            "major_value": "2.50"
          },
          "gross": {
            "display": "$8.00",
            "currency": "USD",
            "value": 800,
            "major_value": "8.00"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000008/",
        "id": "7000000000008",
        "changed": "2030-02-05T12:01:00Z",
        "created": "2030-02-05T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer05",
          "first_name": "Example",
          "last_name": "Buyer05",
          "email": "buyer05@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000008-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-05T12:00:00Z",
            "changed": "2030-02-05T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Presale Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000005",
        "ticket_class_id": "5000000000003"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "display_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "eventbrite_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "gross": {
        "display": "$13.90",
        "currency": "USD",
        "value": 1390,
        "major_value": "13.90"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.65",
          "currency": "USD",
          "value": 65,
          "major_value": "0.65"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 275,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 65,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000006/",
    "id": "6000000000006",
    "changed": "2030-02-06T12:01:00Z",
    "created": "2030-02-06T12:00:00Z",
    "name": "Example Buyer06",
    "first_name": "Example",
    "last_name": "Buyer06",
    "email": "buyer06@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000009/",
        "id": "7000000000009",
        "changed": "2030-02-06T12:01:00Z",
        "created": "2030-02-06T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer06",
          "first_name": "Example",
          "last_name": "Buyer06",
          "email": "buyer06@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000009-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-06T12:00:00Z",
            "changed": "2030-02-06T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000006",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "display_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "eventbrite_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "gross": {
        "display": "$13.90",
        "currency": "USD",
        "value": 1390,
        "major_value": "13.90"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.65",
          "currency": "USD",
          "value": 65,
          "major_value": "0.65"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 275,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 65,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000007/",
    "id": "6000000000007",
    "changed": "2030-02-07T12:01:00Z",
    "created": "2030-02-07T12:00:00Z",
    "name": "Example Buyer07",
    "first_name": "Example",
    "last_name": "Buyer07",
    "email": "buyer07@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000010/",
        "id": "7000000000010",
        "changed": "2030-02-07T12:01:00Z",
        "created": "2030-02-07T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer07",
          "first_name": "Example",
          "last_name": "Buyer07",
          "email": "buyer07@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000010-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-07T12:00:00Z",
            "changed": "2030-02-07T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000007",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "display_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "eventbrite_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "gross": {
        "display": "$13.90",
        "currency": "USD",
        "value": 1390,
        "major_value": "13.90"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.65",
          "currency": "USD",
          "value": 65,
          "major_value": "0.65"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 275,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 65,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000008/",
    "id": "6000000000008",
    "changed": "2030-02-08T12:01:00Z",
    "created": "2030-02-08T12:00:00Z",
    "name": "Example Buyer08",
    "first_name": "Example",
    "last_name": "Buyer08",
    "email": "buyer08@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000011/",
        "id": "7000000000011",
        "changed": "2030-02-08T12:01:00Z",
        "created": "2030-02-08T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer08",
          "first_name": "Example",
          "last_name": "Buyer08",
          "email": "buyer08@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000011-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-08T12:00:00Z",
            "changed": "2030-02-08T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000008",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "display_fee": {
        "display": "$6.50",
        "currency": "USD",
        "value": 650,
        "major_value": "6.50"
      },
      "display_price": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "eventbrite_fee": {
        "display": "$5.50",
        "currency": "USD",
        "value": 550,
        "major_value": "5.50"
      },
      "gross": {
        "display": "$27.80",
        "currency": "USD",
        "value": 2780,
        "major_value": "27.80"
      },
      "payment_fee": {
        "display": "$1.00",
        "currency": "USD",
        "value": 100,
        "major_value": "1.00"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$1.30",
          "currency": "USD",
          "value": 130,
          "major_value": "1.30"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 550,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 100,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 130,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000009/",
    "id": "6000000000009",
    "changed": "2030-02-09T12:01:00Z",
    "created": "2030-02-09T12:00:00Z",
    "name": "Example Buyer09",
    "first_name": "Example",
    "last_name": "Buyer09",
    "email": "buyer09@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000012/",
        "id": "7000000000012",
        "changed": "2030-02-09T12:01:00Z",
        "created": "2030-02-09T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer09",
          "first_name": "Example",
          "last_name": "Buyer09",
          "email": "buyer09@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000012-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-09T12:00:00Z",
            "changed": "2030-02-09T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000009",
        "ticket_class_id": "5000000000006"
      },
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000013/",
        "id": "7000000000013",
        "changed": "2030-02-09T12:01:00Z",
        "created": "2030-02-09T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer09",
          "first_name": "Example",
          "last_name": "Buyer09",
          "email": "buyer09@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000013-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-09T12:00:00Z",
            "changed": "2030-02-09T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000009",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "display_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "eventbrite_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "gross": {
        "display": "$13.90",
        "currency": "USD",
        "value": 1390,
        "major_value": "13.90"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.65",
          "currency": "USD",
          "value": 65,
          "major_value": "0.65"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 275,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 65,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000010/",
    "id": "6000000000010",
    "changed": "2030-02-10T12:01:00Z",
    "created": "2030-02-10T12:00:00Z",
    "name": "Example Buyer10",
    "first_name": "Example",
    "last_name": "Buyer10",
    "email": "buyer10@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000014/",
        "id": "7000000000014",
        "changed": "2030-02-10T12:01:00Z",
        "created": "2030-02-10T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer10",
          "first_name": "Example",
          "last_name": "Buyer10",
          "email": "buyer10@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000014-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-10T12:00:00Z",
            "changed": "2030-02-10T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000010",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "display_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "eventbrite_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "gross": {
        "display": "$13.90",
        "currency": "USD",
        "value": 1390,
        "major_value": "13.90"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.65",
          "currency": "USD",
          "value": 65,
          "major_value": "0.65"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 275,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 65,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000011/",
    "id": "6000000000011",
    "changed": "2030-02-11T12:01:00Z",
    "created": "2030-02-11T12:00:00Z",
    "name": "Example Buyer11",
    "first_name": "Example",
    "last_name": "Buyer11",
    "email": "buyer11@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000015/",
        "id": "7000000000015",
        "changed": "2030-02-11T12:01:00Z",
        "created": "2030-02-11T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer11",
          "first_name": "Example",
          "last_name": "Buyer11",
          "email": "buyer11@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000015-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-11T12:00:00Z",
            "changed": "2030-02-11T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000011",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_fee": {
        "display": "$3.25",
        "currency": "USD",
        "value": 325,
        "major_value": "3.25"
      },
      "display_price": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "eventbrite_fee": {
        "display": "$2.75",
        "currency": "USD",
        "value": 275,
        "major_value": "2.75"
      },
      "gross": {
        "display": "$13.90",
        "currency": "USD",
        "value": 1390,
        "major_value": "13.90"
      },
      "payment_fee": {
        "display": "$0.50",
        "currency": "USD",
        "value": 50,
        "major_value": "0.50"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$10.00",
        "currency": "USD",
        "value": 1000,
        "major_value": "10.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$0.65",
          "currency": "USD",
          "value": 65,
          "major_value": "0.65"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 275,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 50,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 65,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000012/",
    "id": "6000000000012",
    "changed": "2030-02-12T12:01:00Z",
    "created": "2030-02-12T12:00:00Z",
    "name": "Example Buyer12",
    "first_name": "Example",
    "last_name": "Buyer12",
    "email": "buyer12@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000016/",
        "id": "7000000000016",
        "changed": "2030-02-12T12:01:00Z",
        "created": "2030-02-12T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer12",
          "first_name": "Example",
          "last_name": "Buyer12",
          "email": "buyer12@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000016-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-12T12:00:00Z",
            "changed": "2030-02-12T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000012",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "display_fee": {
        "display": "$6.50",
        "currency": "USD",
        "value": 650,
        "major_value": "6.50"
      },
      "display_price": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "eventbrite_fee": {
        "display": "$5.50",
        "currency": "USD",
        "value": 550,
        "major_value": "5.50"
      },
      "gross": {
        "display": "$27.80",
        "currency": "USD",
        "value": 2780,
        "major_value": "27.80"
      },
      "payment_fee": {
        "display": "$1.00",
        "currency": "USD",
        "value": 100,
        "major_value": "1.00"
      },
      "tax": {
        "display": "$0.00",
        "currency": "USD",
        "value": 0,
        "major_value": "0.00"
      },
      "price_before_discount": {
        "display": "$20.00",
        "currency": "USD",
        "value": 2000,
        "major_value": "20.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$1.30",
          "currency": "USD",
          "value": 130,
          "major_value": "1.30"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 550,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 100,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 130,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000013/",
    "id": "6000000000013",
    "changed": "2030-02-13T12:01:00Z",
    "created": "2030-02-13T12:00:00Z",
    "name": "Example Buyer13",
    "first_name": "Example",
    "last_name": "Buyer13",
    "email": "buyer13@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000017/",
        "id": "7000000000017",
        "changed": "2030-02-13T12:01:00Z",
        "created": "2030-02-13T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer13",
          "first_name": "Example",
          "last_name": "Buyer13",
          "email": "buyer13@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000017-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-13T12:00:00Z",
            "changed": "2030-02-13T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000013",
        "ticket_class_id": "5000000000006"
      },
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000018/",
        "id": "7000000000018",
        "changed": "2030-02-13T12:01:00Z",
        "created": "2030-02-13T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer13",
          "first_name": "Example",
          "last_name": "Buyer13",
          "email": "buyer13@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000018-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-13T12:00:00Z",
            "changed": "2030-02-13T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000013",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": true,
      "has_opted_in": true
    }
  },
  {
    "costs": {
      "base_price": {
        "display": "$40.00",
        "currency": "USD",
        "value": 4000,
        "major_value": "40.00"
      },
      "display_fee": {
        "display": "$13.00",
        "currency": "USD",
        "value": 1300,
        "major_value": "13.00"
      },
      "display_price": {
        "display": "$40.00",
        "currency": "USD",
        "value": 4000,
        "major_value": "40.00"
      },
      "eventbrite_fee": {
        "display": "$11.00",
        "currency": "USD",
        "value": 1100,
        "major_value": "11.00"
      },
      "gross": {
        "display": "$55.60",
        "currency": "USD",
        "value": 5560,
        "major_value": "55.60"
      },
      "payment_fee": {
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
      "price_before_discount": {
        "display": "$40.00",
        "currency": "USD",
        "value": 4000,
        "major_value": "40.00"
      },
      "display_tax": {
        "name": "eventbrite.gts.tax",
        "tax": {
          "display": "$2.60",
          "currency": "USD",
          "value": 260,
          "major_value": "2.60"
        }
      },
      "has_gts_tax": true,
      "fee_components": [
        {
          "name": "eventbrite.service_fee",
          "payer": "attendee",
          "bucket": "fee",
          "value": 1100,
          "group_name": "eventbrite.service_fee",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.service_fee",
          "base": null,
          "recipient": "event"
        },
        {
          "name": "eventbrite.payment_fee_v2",
          "payer": "attendee",
          "bucket": "fee",
          "value": 200,
          "group_name": "eventbrite.payment_fee_v2",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.payment_fee_v2",
          "base": null,
          "recipient": "event"
        }
      ],
      "shipping_components": [],
      "tax_components": [
        {
          "name": "eventbrite.gts.tax",
          "bucket": "tax",
          "value": 260,
          "group_name": "eventbrite.gts.tax",
          "discount": null,
          "intermediate": false,
          "rule": {},
          "internal_name": "eventbrite.gts.tax",
          "base": null,
          "recipient": "eventbrite",
          "payer": "attendee",
          "title": "GTS tax"
        }
      ]
    },
    "resource_uri": "https://api.example.com/v3/orders/6000000000014/",
    "id": "6000000000014",
    "changed": "2030-02-14T12:01:00Z",
    "created": "2030-02-14T12:00:00Z",
    "name": "Example Buyer14",
    "first_name": "Example",
    "last_name": "Buyer14",
    "email": "buyer14@example.com",
    "status": "placed",
    "time_remaining": 0,
    "event_id": "1000000000001",
    "attendees": [
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000019/",
        "id": "7000000000019",
        "changed": "2030-02-14T12:01:00Z",
        "created": "2030-02-14T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer14",
          "first_name": "Example",
          "last_name": "Buyer14",
          "email": "buyer14@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000019-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-14T12:00:00Z",
            "changed": "2030-02-14T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000014",
        "ticket_class_id": "5000000000006"
      },
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000020/",
        "id": "7000000000020",
        "changed": "2030-02-14T12:01:00Z",
        "created": "2030-02-14T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer14",
          "first_name": "Example",
          "last_name": "Buyer14",
          "email": "buyer14@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000020-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-14T12:00:00Z",
            "changed": "2030-02-14T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000014",
        "ticket_class_id": "5000000000006"
      },
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000021/",
        "id": "7000000000021",
        "changed": "2030-02-14T12:01:00Z",
        "created": "2030-02-14T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer14",
          "first_name": "Example",
          "last_name": "Buyer14",
          "email": "buyer14@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000021-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-14T12:00:00Z",
            "changed": "2030-02-14T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000014",
        "ticket_class_id": "5000000000006"
      },
      {
        "costs": {
          "base_price": {
            "display": "$10.00",
            "currency": "USD",
            "value": 1000,
            "major_value": "10.00"
          },
          "eventbrite_fee": {
            "display": "$3.40",
            "currency": "USD",
            "value": 340,
            "major_value": "3.40"
          },
          "gross": {
            "display": "$13.90",
            "currency": "USD",
            "value": 1390,
            "major_value": "13.90"
          },
          "payment_fee": {
            "display": "$0.50",
            "currency": "USD",
            "value": 50,
            "major_value": "0.50"
          },
          "tax": {
            "display": "$0.00",
            "currency": "USD",
            "value": 0,
            "major_value": "0.00"
          }
        },
        "resource_uri": "https://api.example.com/v3/events/1000000000001/attendees/7000000000022/",
        "id": "7000000000022",
        "changed": "2030-02-14T12:01:00Z",
        "created": "2030-02-14T12:00:00Z",
        "quantity": 1,
        "variant_id": null,
        "profile": {
          "name": "Example Buyer14",
          "first_name": "Example",
          "last_name": "Buyer14",
          "email": "buyer14@example.com",
          "addresses": {}
        },
        "barcodes": [
          {
            "barcode": "TEST-7000000000022-001",
            "status": "unused",
            "checkin_type": 0,
            "is_printed": false,
            "created": "2030-02-14T12:00:00Z",
            "changed": "2030-02-14T12:01:00Z"
          }
        ],
        "answers": [],
        "checked_in": false,
        "cancelled": false,
        "refunded": false,
        "affiliate": "example-test-campaign",
        "guestlist_id": null,
        "invited_by": null,
        "status": "Attending",
        "ticket_class_name": "Early Bird Admission",
        "delivery_method": "electronic",
        "release_time_utc": null,
        "event_id": "1000000000001",
        "order_id": "6000000000014",
        "ticket_class_id": "5000000000006"
      }
    ],
    "ticket_buyer_settings": {
      "ticket_class_confirmation_settings": [],
      "event_id": "1000000000001",
      "confirmation_message": {
        "text": null,
        "html": null
      },
      "refund_request_enabled": true,
      "instructions": {
        "text": null,
        "html": null
      }
    },
    "contact_list_preferences": {
      "_type": "order_contact_list_preferences",
      "has_contact_list": false,
      "has_opted_in": false
    }
  }
];

export type EventbriteExpandedOrderFixture = typeof ordersFixture[number];
export type EventbriteOrderFixture = Omit<EventbriteExpandedOrderFixture, "attendees">;
export type EventbriteAttendeeFixture = EventbriteExpandedOrderFixture["attendees"][number];

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

export type EventbriteOrdersListingFixture = {
  orders: EventbriteExpandedOrderFixture[];
  pagination: ReturnType<typeof pagination>;
};

export type EventbriteAttendeeListingFixture = {
  attendees: EventbriteAttendeeFixture[];
  pagination: ReturnType<typeof pagination>;
};

export type EventbriteOrdersFixtureOptions =
  | { type?: "listing" }
  | { type: "orders" }
  | { type: "order"; orderIndex?: number }
  | { type: "expanded_order"; orderIndex?: number }
  | { type: "attendee"; orderIndex?: number; attendeeIndex?: number }
  | { type: "attendees"; orderIndex?: number }
  | { type: "attendee_listing"; orderIndex?: number };

type EventbriteOrdersFixtureResult =
  | EventbriteOrdersListingFixture
  | EventbriteExpandedOrderFixture[]
  | EventbriteOrderFixture
  | EventbriteExpandedOrderFixture
  | EventbriteAttendeeFixture
  | EventbriteAttendeeFixture[]
  | EventbriteAttendeeListingFixture;

function validateIndex(index: number, length: number, name: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new RangeError(`${name} must be an integer from 0 to ${length - 1}`);
  }
}

/**
 * Return a fresh, independently mutable fixture on every call.
 * Order and attendee indexes are zero-based and default to zero. Attendee
 * arrays and listings contain only the selected order's attendees.
 *
 * @example
 * createEventbriteOrdersFixture(); // { orders: [...expandedOrders], pagination }
 * createEventbriteOrdersFixture({ type: "orders" }); // expanded orders array
 * createEventbriteOrdersFixture({ type: "order" }); // order without attendees
 * createEventbriteOrdersFixture({ type: "expanded_order", orderIndex: 4 }); // four attendees
 * createEventbriteOrdersFixture({ type: "attendee", orderIndex: 4, attendeeIndex: 1 });
 * createEventbriteOrdersFixture({ type: "attendees", orderIndex: 4 }); // attendees array
 * createEventbriteOrdersFixture({ type: "attendee_listing", orderIndex: 4 }); // { attendees, pagination }
 */
export function createEventbriteOrdersFixture(options?: { type?: "listing" }): EventbriteOrdersListingFixture;
export function createEventbriteOrdersFixture(options: { type: "orders" }): EventbriteExpandedOrderFixture[];
export function createEventbriteOrdersFixture(options: { type: "order"; orderIndex?: number }): EventbriteOrderFixture;
export function createEventbriteOrdersFixture(options: { type: "expanded_order"; orderIndex?: number }): EventbriteExpandedOrderFixture;
export function createEventbriteOrdersFixture(options: { type: "attendee"; orderIndex?: number; attendeeIndex?: number }): EventbriteAttendeeFixture;
export function createEventbriteOrdersFixture(options: { type: "attendees"; orderIndex?: number }): EventbriteAttendeeFixture[];
export function createEventbriteOrdersFixture(options: { type: "attendee_listing"; orderIndex?: number }): EventbriteAttendeeListingFixture;
export function createEventbriteOrdersFixture(options: EventbriteOrdersFixtureOptions): EventbriteOrdersFixtureResult;
export function createEventbriteOrdersFixture(options: EventbriteOrdersFixtureOptions = {}): EventbriteOrdersFixtureResult {
  const orders = structuredClone(ordersFixture);
  if (options.type === "listing" || options.type === undefined) {
    return { orders, pagination: pagination(orders.length) };
  }
  if (options.type === "orders") {
    return orders;
  }

  const orderIndex = ("orderIndex" in options ? options.orderIndex : undefined) ?? 0;
  validateIndex(orderIndex, orders.length, "orderIndex");
  const order = orders[orderIndex];

  switch (options.type) {
    case "order": {
      const { attendees, ...orderOnly } = order;
      return orderOnly;
    }
    case "expanded_order":
      return order;
    case "attendee": {
      const index = options.attendeeIndex ?? 0;
      validateIndex(index, order.attendees.length, "attendeeIndex");
      return order.attendees[index];
    }
    case "attendees":
      return order.attendees;
    case "attendee_listing":
      return { attendees: order.attendees, pagination: pagination(order.attendees.length) };
  }
}
