/** Source invocation metadata supplied when converting previously fetched data. */
export interface ConversionContext {
  companyId: string;
  app: string;
  version: string;
  action: string;
  connectionId: string;
}
