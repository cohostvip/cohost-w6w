import type { ConversionContext } from "../../../../shared/context.ts";

/** Synthetic company and connection context; the connection ID is a generated test value. */
export function createEventbriteContextFixture(overrides: Partial<ConversionContext> = {}): ConversionContext {
  return {
    companyId: "company_test_eventbrite",
    connectionId: "conn_test_YYvhP6e7Irvfthu6",
    ...overrides,
  };
}
