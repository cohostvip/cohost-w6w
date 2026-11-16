import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import orderConfirmationRequested from "../../triggers/order-confirmation-requested.ts";

const PING = {
  id: "trg_3",
  action: "order.confirmation-requested",
  timestamp: "2026-08-24T00:00:00.000Z",
  urn: "urn:1:co_1:cohost-falcon:/orders/ord_abc",
  context: { companyId: "co_1", service: "cohost-falcon", resourcePath: "/orders/ord_abc" },
};

test("order-confirmation-requested: onSubscribe POSTs /webhooks and returns the created id as state", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_3" } }]);
  const state = await orderConfirmationRequested.onSubscribe!(
    { params: {}, subscriptionId: "sub_3", callbackUrl: "https://w6w.example/hooks/sub_3", hostUrl: "https://w6w.example" },
    ctx,
  );
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
  const body = JSON.parse(calls[0].body!);
  expect(body).toEqual({
    name: "w6w: order confirmation requested",
    url: "https://w6w.example/hooks/sub_3",
    events: ["order.confirmation-requested"],
  });
  expect(state).toEqual({ webhookId: "wh_3" });
});

test("order-confirmation-requested: onUnsubscribe DELETEs /webhooks/{id} from state", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await orderConfirmationRequested.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_3" }, subscriptionId: "sub_3" },
    ctx,
  );
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks/wh_3");
});

test("order-confirmation-requested: handleIngest sends the unified payload — the fetched order in data, its payments in meta", async () => {
  const order = { id: "ord_abc", status: "placed", orderNumber: "CH-100245", contextId: "evt_ev_1" };
  const transactions = [{ provider: "authnet", status: "approved" }];
  const { ctx, calls } = mockCtx([{ body: { order, organizer: null, transaction: null, transactions } }]);
  const events = await orderConfirmationRequested.handleIngest(
    { raw: { body: PING }, params: {}, state: { webhookId: "wh_3" }, subscriptionId: "sub_3" },
    ctx,
  );
  expect(calls[0].method).toBe("GET");
  expect(new URL(calls[0].url).pathname).toBe("/v1/orders/ord_abc");
  expect(events).toEqual([
    {
      urn: PING.urn,
      action: PING.action,
      type: "order",
      id: "ord_abc",
      timestamp: PING.timestamp,
      data: order,
      meta: {
        changedFields: [],
        companyId: "co_1",
        eventId: "ev_1",
        resourcePath: "/orders/ord_abc",
        deliveryId: "trg_3",
        transactions,
      },
    },
  ]);
});
