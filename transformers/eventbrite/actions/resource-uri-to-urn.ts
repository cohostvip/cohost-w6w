import type { ActionDefinition } from "@w6w/types";
import { companyIdParam } from "../lib/params.ts";
import { resourcePathFromUri } from "../lib/resource-uri.ts";
import { generateUrn } from "../../../shared/urn.ts";

interface Input {
  resourceUri: string;
  companyId: string;
  connectionId: string;
}

interface Output {
  urn: string;
  resourcePath: string;
}

const resourceUriToUrnAction: ActionDefinition<Input, Output> = {
  key: "resource-uri-to-urn",
  type: "perform",
  resource: "transform",
  title: "Eventbrite Resource URI → URN",
  description: "Build the source URN for an Eventbrite API resource_uri — the same URN Eventbrite → Cohost stamps on the converted object.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "resourceUri", label: "Resource URI", type: "string", required: true, hint: "e.g. https://www.eventbriteapi.com/v3/events/123/ticket_classes/456/" },
    companyIdParam("The Cohost company the URN belongs to. Defaults to this account."),
    { key: "connectionId", label: "Connection ID", type: "string", required: true, hint: "The Eventbrite connection, e.g. conn_…" },
  ],

  execute(input) {
    const resourcePath = resourcePathFromUri(input.resourceUri);
    const { companyId, connectionId } = input;
    return { urn: generateUrn(resourcePath, { companyId, connectionId }), resourcePath };
  },
};

export default resourceUriToUrnAction;
