import { expect, test } from "vitest";
import { mockCtx } from "../_helpers.ts";
import listOrganizers from "../../actions/list-organizers.ts";
import getOrganizer from "../../actions/get-organizer.ts";
import createOrganizer from "../../actions/create-organizer.ts";
import updateOrganizer from "../../actions/update-organizer.ts";
import deleteOrganizer from "../../actions/delete-organizer.ts";

test("list-organizers: re-keys the { organizers } envelope to { results }", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizers: [{ id: "org_1", name: "Acme" }] } }]);
  const out = await listOrganizers.execute({}, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/organizers");
  expect(out).toEqual({ results: [{ id: "org_1", name: "Acme" }] });
});

test("get-organizer: unwraps the { organizer } envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizer: { id: "org_1", name: "Acme" } } }]);
  const out = await getOrganizer.execute({ organizer: "org_1" }, ctx);
  expect(new URL(calls[0].url).pathname).toBe("/v1/organizers/org_1");
  expect(out).toEqual({ id: "org_1", name: "Acme" });
});

test("create-organizer: wraps the body and merges name over the extra fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizer: { id: "org_1", name: "Acme" } } }]);
  const out = await createOrganizer.execute(
    { name: "Acme", organizer: { headline: "Live events" } },
    ctx,
  );
  expect(calls[0].method).toBe("POST");
  expect(JSON.parse(calls[0].body!)).toEqual({
    organizer: { headline: "Live events", name: "Acme" },
  });
  expect((out as { id: string }).id).toBe("org_1");
});

test("update-organizer: PATCHes with the { organizer } wrapper and unwraps the reply", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizer: { id: "org_1", name: "Acme Events" } } }]);
  const out = await updateOrganizer.execute(
    { organizer: "org_1", patch: { name: "Acme Events" } },
    ctx,
  );
  expect(calls[0].method).toBe("PATCH");
  expect(new URL(calls[0].url).pathname).toBe("/v1/organizers/org_1");
  expect(JSON.parse(calls[0].body!)).toEqual({ organizer: { name: "Acme Events" } });
  expect((out as { name: string }).name).toBe("Acme Events");
});

test("delete-organizer: DELETEs and tolerates a null body", async () => {
  const { ctx, calls } = mockCtx([{ body: null }]);
  const out = await deleteOrganizer.execute({ organizer: "org_1" }, ctx);
  expect(calls[0].method).toBe("DELETE");
  expect(out).toEqual({ deleted: true, id: "org_1" });
});
