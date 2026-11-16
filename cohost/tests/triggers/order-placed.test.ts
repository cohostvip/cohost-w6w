import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import orderPlaced from "../../triggers/order-placed.ts";

const PING = {
  id: "trg_1",
  action: "order.placed",
  timestamp: "2026-08-24T00:00:00.000Z",
  urn: "urn:1:co_1:cohost-falcon:/orders/ord_abc",
  context: { companyId: "co_1", service: "cohost-falcon", resourcePath: "/orders/ord_abc" },
};

test("order-placed: onSubscribe POSTs /webhooks and returns the created id as state", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_1" } }]);
  const state = await orderPlaced.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: "https://w6w.example/hooks/sub_1", hostUrl: "https://w6w.example" },
    ctx,
  );
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
  const body = JSON.parse(calls[0].body!);
  expect(body).toEqual({ name: "w6w: order placed", url: "https://w6w.example/hooks/sub_1", events: ["order.placed"] });
  expect(state).toEqual({ webhookId: "wh_1" });
});

test("order-placed: onUnsubscribe DELETEs /webhooks/{id} from state", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await orderPlaced.onUnsubscribe!({ params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks/wh_1");
});

test("order-placed: handleIngest sends the unified payload — the fetched order in data, its payments in meta", async () => {
  const order = { id: "ord_abc", status: "placed", orderNumber: "CH-100245", contextId: "evt_ev_1" };
  const transactions = [{ provider: "authnet", status: "approved" }];
  const { ctx, calls } = mockCtx([{ body: { order, organizer: null, transaction: null, transactions } }]);
  const events = await orderPlaced.handleIngest(
    { raw: { body: PING }, params: {}, state: { webhookId: "wh_1" }, subscriptionId: "sub_1" },
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
        deliveryId: "trg_1",
        transactions,
      },
    },
  ]);
});
