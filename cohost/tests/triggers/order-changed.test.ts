import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import orderChanged from "../../triggers/order-changed.ts";

const PING = {
  id: "trg_2",
  action: "order.changed",
  timestamp: "2026-08-24T00:00:00.000Z",
  urn: "urn:1:co_1:cohost-falcon:/orders/ord_abc",
  context: { companyId: "co_1", service: "cohost-falcon", resourcePath: "/orders/ord_abc" },
  data: { changedFields: ["status"] },
};

test("order-changed: onSubscribe POSTs /webhooks and returns the created id as state", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_2" } }]);
  const state = await orderChanged.onSubscribe!(
    { params: {}, subscriptionId: "sub_2", callbackUrl: "https://w6w.example/hooks/sub_2", hostUrl: "https://w6w.example" },
    ctx,
  );
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks");
  const body = JSON.parse(calls[0].body!);
  expect(body).toEqual({ name: "w6w: order changed", url: "https://w6w.example/hooks/sub_2", events: ["order.changed"] });
  expect(state).toEqual({ webhookId: "wh_2" });
});

test("order-changed: onUnsubscribe DELETEs /webhooks/{id} from state", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await orderChanged.onUnsubscribe!({ params: {}, state: { webhookId: "wh_2" }, subscriptionId: "sub_2" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(new URL(calls[0].url).pathname).toBe("/v1/webhooks/wh_2");
});

test("order-changed: handleIngest fetches the full order from the ping's resourcePath", async () => {
  const order = { id: "ord_abc", status: "changed", orderNumber: "CH-100245" };
  const { ctx, calls } = mockCtx([{ body: order }]);
  const events = await orderChanged.handleIngest(
    { raw: PING, params: {}, state: { webhookId: "wh_2" }, subscriptionId: "sub_2" },
    ctx,
  );
  expect(calls[0].method).toBe("GET");
  expect(new URL(calls[0].url).pathname).toBe("/v1/orders/ord_abc");
  expect(events).toEqual([order]);
});
