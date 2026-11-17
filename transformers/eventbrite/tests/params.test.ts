import { expect, test } from "vitest";
import ebToCohost from "../actions/eventbrite-to-cohost.ts";
import resourceUriToUrn from "../actions/resource-uri-to-urn.ts";

test.each([
  ["eventbrite-to-cohost", ebToCohost],
  ["resource-uri-to-urn", resourceUriToUrn],
])("%s: companyId is hidden and defaults to the calling account", (_key, action) => {
  const param = action.params?.find(p => p.key === "companyId") as Record<string, unknown> | undefined;
  expect(param).toMatchObject({
    label: "Company ID",
    type: "string",
    required: true,
    hidden: true,
    default: "{{ const.account_id }}",
  });
});
