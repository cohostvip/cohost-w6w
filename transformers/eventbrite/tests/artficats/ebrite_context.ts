import type { ConversionContext } from "../../../../shared/context.ts";

/** Synthetic company and invocation context; the connection ID is a generated test value. */
export function createEventbriteContextFixture(overrides: Partial<ConversionContext> = {}): ConversionContext {
  return {
    companyId: "company_test_eventbrite",
    app: "io.w6w.eventbrite",
    version: "0.4.2",
    action: "get-event",
    connectionId: "conn_test_YYvhP6e7Irvfthu6",
    ...overrides,
  };
}
