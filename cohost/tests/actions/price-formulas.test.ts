import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import assignPriceFormula from "../../actions/assign-price-formula.ts";
import createPriceFormula from "../../actions/create-price-formula.ts";
import deletePriceFormula from "../../actions/delete-price-formula.ts";
import getPriceFormula from "../../actions/get-price-formula.ts";
import listPriceFormulas from "../../actions/list-price-formulas.ts";
import updatePriceFormula from "../../actions/update-price-formula.ts";

const ok = (data: unknown) => ({ body: { status: "ok", data } });
const path = (url: string) => new URL(url).pathname;

const vip = {
  id: "pf_vip",
  name: "EB VIP",
  description: "VIP tier",
  markupPercent: 15,
  amount: "USD,1000",
  usage: { events: 2, listings: 3, tickets: 40 },
};

test("the app registers the whole price-formula surface", () => {
  const keys = app.actions.filter((a) => a.resource === "price-formula").map((a) => a.key);
  expect(keys).toEqual([
    "list-price-formulas",
    "get-price-formula",
    "create-price-formula",
    "update-price-formula",
    "delete-price-formula",
    "assign-price-formula",
  ]);
});

test("lists the company's formulas as { results }", async () => {
  const { ctx, calls } = mockCtx([ok([vip])]);

  const out = await listPriceFormulas.execute({}, ctx);

  expect(calls[0].method).toBe("GET");
  expect(path(calls[0].url)).toBe("/v1/company/price-formulas");
  expect(out).toEqual({ results: [vip] });
});

test("gets one formula with its assignments", async () => {
  const detail = { ...vip, assignments: [{ eventId: "ev_1", channelId: "ch_eb", listingId: "primary", offeringIds: ["t1"], listingWide: false }] };
  const { ctx, calls } = mockCtx([ok(detail)]);

  expect(await getPriceFormula.execute({ formulaId: " pf_vip " }, ctx)).toEqual(detail);
  expect(path(calls[0].url)).toBe("/v1/company/price-formulas/pf_vip");
});

test("creates a markup + amount formula, the amount in minor units of its currency", async () => {
  const { ctx, calls } = mockCtx([ok(vip)]);

  await createPriceFormula.execute(
    { name: " EB VIP ", currency: "USD", markupPercent: 15, amount: 10, description: "VIP tier" },
    ctx,
  );

  expect(calls[0].method).toBe("POST");
  expect(path(calls[0].url)).toBe("/v1/company/price-formulas");
  expect(JSON.parse(calls[0].body!)).toEqual({ name: "EB VIP", markupPercent: 15, amount: "USD,1000", description: "VIP tier" });
});

test("creates a markup-only formula without an amount", async () => {
  const { ctx, calls } = mockCtx([ok({})]);

  await createPriceFormula.execute({ name: "EB GA", currency: "USD", markupPercent: 20, amount: 0 }, ctx);

  expect(JSON.parse(calls[0].body!)).toEqual({ name: "EB GA", markupPercent: 20 });
});

test("creates a formula capped at an amount, or at a percent of the price", async () => {
  const byAmount = mockCtx([ok({})]);
  await createPriceFormula.execute(
    { name: "EB capped", currency: "USD", markupPercent: 25, amount: 10, capType: "amount", cap: 100 },
    byAmount.ctx,
  );
  expect(JSON.parse(byAmount.calls[0].body!)).toEqual({
    name: "EB capped",
    markupPercent: 25,
    amount: "USD,1000",
    capAmount: "USD,10000",
  });

  const byPercent = mockCtx([ok({})]);
  await createPriceFormula.execute(
    { name: "EB pct", currency: "USD", markupPercent: 10, amount: 10, capType: "percent", cap: 20 },
    byPercent.ctx,
  );
  expect(JSON.parse(byPercent.calls[0].body!)).toEqual({ name: "EB pct", markupPercent: 10, amount: "USD,1000", capPercent: 20 });
});

test("refuses a cap type without a cap value, before calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await expect(
    createPriceFormula.execute({ name: "x", currency: "USD", markupPercent: 10, capType: "amount" }, ctx),
  ).rejects.toThrow(/Cap must be a number above 0/);
  expect(calls).toHaveLength(0);
});

test("keeps, changes, switches and removes a formula's cap", async () => {
  const capped = { ...vip, markupPercent: 25, capAmount: "USD,10000" };

  const kept = mockCtx([ok(capped), ok({})]);
  await updatePriceFormula.execute({ formulaId: "pf_vip", markupPercent: 30 }, kept.ctx);
  expect(JSON.parse(kept.calls[1].body!)).toMatchObject({ markupPercent: 30, capAmount: "USD,10000" });

  const raised = mockCtx([ok(capped), ok({})]);
  await updatePriceFormula.execute({ formulaId: "pf_vip", cap: 150 }, raised.ctx);
  expect(JSON.parse(raised.calls[1].body!)).toMatchObject({ capAmount: "USD,15000" });

  const switched = mockCtx([ok(capped), ok({})]);
  await updatePriceFormula.execute({ formulaId: "pf_vip", capType: "percent", cap: 20 }, switched.ctx);
  const body = JSON.parse(switched.calls[1].body!);
  expect(body).toMatchObject({ capPercent: 20 });
  expect(body).not.toHaveProperty("capAmount");

  const removed = mockCtx([ok(capped), ok({})]);
  await updatePriceFormula.execute({ formulaId: "pf_vip", capType: "none" }, removed.ctx);
  expect(JSON.parse(removed.calls[1].body!)).toEqual({ name: "EB VIP", markupPercent: 25, amount: "USD,1000", description: "VIP tier" });

  const unclear = mockCtx([ok(capped)]);
  await expect(updatePriceFormula.execute({ formulaId: "pf_vip", capType: "percent" }, unclear.ctx)).rejects.toThrow(
    /Cap value is required/,
  );
});

test("updates only the fields given, keeping the rest of the formula", async () => {
  const { ctx, calls } = mockCtx([ok(vip), ok({ ...vip, markupPercent: 18, assignments: [] })]);

  const out = await updatePriceFormula.execute({ formulaId: "pf_vip", markupPercent: 18 }, ctx);

  expect(calls.map((c) => [c.method, path(c.url)])).toEqual([
    ["GET", "/v1/company/price-formulas/pf_vip"],
    ["PUT", "/v1/company/price-formulas/pf_vip"],
  ]);
  expect(JSON.parse(calls[1].body!)).toEqual({ name: "EB VIP", markupPercent: 18, amount: "USD,1000", description: "VIP tier" });
  expect(out).toMatchObject({ markupPercent: 18 });
});

test("removes the amount with 0, and changes its currency", async () => {
  const removed = mockCtx([ok(vip), ok({})]);
  await updatePriceFormula.execute({ formulaId: "pf_vip", amount: 0 }, removed.ctx);
  expect(JSON.parse(removed.calls[1].body!)).toEqual({ name: "EB VIP", markupPercent: 15, description: "VIP tier" });

  const moved = mockCtx([ok(vip), ok({})]);
  await updatePriceFormula.execute({ formulaId: "pf_vip", currency: "CAD" }, moved.ctx);
  expect(JSON.parse(moved.calls[1].body!)).toMatchObject({ amount: "CAD,1000" });
});

test("deletes a formula, reporting { deleted }", async () => {
  const { ctx, calls } = mockCtx([ok({ deleted: true, id: "pf_vip" })]);

  expect(await deletePriceFormula.execute({ formulaId: "pf_vip" }, ctx)).toEqual({ deleted: true, id: "pf_vip" });
  expect(calls[0].method).toBe("DELETE");
  expect(path(calls[0].url)).toBe("/v1/company/price-formulas/pf_vip");
});

test("surfaces the refusal to delete a formula still in use", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: { status: "error", error: { message: "This price formula still prices tickets on 3 channel listing(s)", code: "PRICE_FORMULA_IN_USE" } } },
  ]);

  await expect(deletePriceFormula.execute({ formulaId: "pf_vip" }, ctx)).rejects.toThrow(/still prices tickets|409/);
});

const customization = (pricing: Record<string, unknown> | undefined) => ({
  channelId: "ch_eb",
  listingId: "primary",
  customization: { name: "EB Night", fees: [{ id: "f1", name: "Fee", bucket: "fee", base: "item", percent: 5 }], ...(pricing ? { pricing } : {}) },
});

test("assigns a formula to the named tickets, dropping their own channel price, keeping the rest", async () => {
  const { ctx, calls } = mockCtx([
    ok(customization({ markupPercent: 10, prices: { t_vip: "USD,9000", t_ga: "USD,1000" }, formulas: { t_ga: "pf_ga" } })),
    ok(customization({ markupPercent: 10, prices: { t_ga: "USD,1000" }, formulas: { t_ga: "pf_ga", t_vip: "pf_vip", t_fast: "pf_vip" } })),
  ]);

  const out = await assignPriceFormula.execute(
    { channelId: "ch_eb", event: "urn:1:co:cohost-falcon:/events/ev_9", formulaId: "pf_vip", tickets: "t_vip, t_fast\nt_vip" },
    ctx,
  );

  expect(calls.map((c) => [c.method, path(c.url)])).toEqual([
    ["GET", "/v1/events/ev_9/channels/ch_eb/customization"],
    ["PUT", "/v1/events/ev_9/channels/ch_eb/customization"],
  ]);
  expect(JSON.parse(calls[1].body!)).toEqual({
    customization: {
      name: "EB Night",
      fees: [{ id: "f1", name: "Fee", bucket: "fee", base: "item", percent: 5 }],
      pricing: { markupPercent: 10, prices: { t_ga: "USD,1000" }, formulas: { t_ga: "pf_ga", t_vip: "pf_vip", t_fast: "pf_vip" } },
    },
  });
  expect(out).toMatchObject({ eventId: "ev_9", channelId: "ch_eb", listingId: "primary", pricing: { formulas: { t_vip: "pf_vip" } } });
});

test("sets the whole listing's formula when no tickets are named, on an extra listing", async () => {
  const { ctx, calls } = mockCtx([ok({ listingId: "vip1", customization: null }), ok({ listingId: "vip1", customization: {} })]);

  await assignPriceFormula.execute({ channelId: "ch_eb", event: "ev_1", formulaId: "pf_ga", listingId: "vip1" }, ctx);

  expect(new URL(calls[0].url).searchParams.get("listingId")).toBe("vip1");
  expect(new URL(calls[1].url).searchParams.get("listingId")).toBe("vip1");
  expect(JSON.parse(calls[1].body!)).toEqual({ customization: { fees: [], pricing: { prices: {}, formulas: {}, formulaId: "pf_ga" } } });
});

test("a blank formula removes it from the tickets, or from the listing", async () => {
  const tickets = mockCtx([ok(customization({ prices: {}, formulaId: "pf_ga", formulas: { t_vip: "pf_vip" } })), ok({})]);
  await assignPriceFormula.execute({ channelId: "ch_eb", event: "ev_1", tickets: "t_vip" }, tickets.ctx);
  expect(JSON.parse(tickets.calls[1].body!).customization.pricing).toEqual({ prices: {}, formulaId: "pf_ga", formulas: {} });

  const listing = mockCtx([ok(customization({ prices: {}, formulaId: "pf_ga", formulas: { t_vip: "pf_vip" } })), ok({})]);
  await assignPriceFormula.execute({ channelId: "ch_eb", event: "ev_1", formulaId: " " }, listing.ctx);
  expect(JSON.parse(listing.calls[1].body!).customization.pricing).toEqual({ prices: {}, formulas: { t_vip: "pf_vip" } });
});
