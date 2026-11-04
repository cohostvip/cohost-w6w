import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import findMappedResources from "../../actions/find-mapped-resources.ts";
import resolveUrn from "../../actions/resolve-urn.ts";

const TICKET_URN = "urn:1:co_1:cohost-falcon:/events/evt_1/tickets/tkt_1";
const EB_URN = "urn:1:co_1:conn_1:/events/111/ticket_classes/222";

test("find-mapped-resources: GETs /rms/urn/search with the urn and wraps the bare array", async () => {
  const mapped = [{ urn: EB_URN, labels: { source: "eventbrite" }, meta: { implementation: { id: "eventbrite@1.0.0" } } }];
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: mapped } }]);
  const out = await findMappedResources.execute({ urn: TICKET_URN }, ctx);
  const url = new URL(calls[0].url);
  expect(calls[0].method).toBe("GET");
  expect(url.pathname).toBe("/v1/rms/urn/search");
  expect(url.searchParams.get("urn")).toBe(TICKET_URN);
  expect(out).toEqual({ results: mapped });
});

test("resolve-urn: POSTs /rms/urn/resolve, sending type only when set", async () => {
  const resolved = { urn: EB_URN, labels: {}, resources: [] };
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: resolved } }, { body: { status: "ok", data: resolved } }]);

  expect(await resolveUrn.execute({ urn: EB_URN }, ctx)).toEqual(resolved);
  expect(calls[0].method).toBe("POST");
  expect(new URL(calls[0].url).pathname).toBe("/v1/rms/urn/resolve");
  expect(JSON.parse(calls[0].body!)).toEqual({ urn: EB_URN });

  await resolveUrn.execute({ urn: EB_URN, type: "system-resource" }, ctx);
  expect(JSON.parse(calls[1].body!)).toEqual({ urn: EB_URN, type: "system-resource" });
});

test("find-mapped-resources: forwards counterpart label filters as JSON", async () => {
  const labels = { "custom-label": "custom-value", "-source": "partner", capabilities: ["custom-capability"] };
  const { ctx, calls } = mockCtx([{ body: { status: "ok", data: [] } }]);
  expect(await findMappedResources.execute({ urn: TICKET_URN, labels }, ctx)).toEqual({ results: [] });
  expect(JSON.parse(new URL(calls[0].url).searchParams.get("labels")!)).toEqual(labels);
  expect(findMappedResources.params?.some(p => p.key === "labels" && p.type === "json")).toBe(true);
  expect(findMappedResources.params?.find(p => p.key === "labels")?.default).toBeUndefined();
});

