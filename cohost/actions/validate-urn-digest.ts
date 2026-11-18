import type { ActionDefinition } from "@w6w/types";
import { CohostClient } from "../lib/client.ts";
import { computeDigest, parseFields } from "../lib/digest.ts";

interface Input {
  urn: string;
  digest?: string;
  data?: unknown;
  fields?: string[] | string;
}

interface Output {
  urn: string;
  valid: boolean;
  digest: string;
}

/**
 * POST /rms/urn/digest/validate — does the digest stored on a URN still match?
 * `valid` is true only on an exact match; false when the URN was never imported,
 * never digested, or the content changed — i.e. false means "(re-)import it".
 *
 * Pass a precomputed Digest, or the Data (+ Fields) to digest here; the digest
 * used is returned so a re-import can stamp it via Sync Object's Mapped URN Digest.
 *
 * Private endpoint — not in the Node SDK.
 */
const validateUrnDigest: ActionDefinition<Input, Output> = {
  key: "validate-urn-digest",
  type: "read",
  resource: "urn",
  title: "Validate URN Digest",
  description:
    "Check whether a remote record (e.g. an Eventbrite order URN) is unchanged since it was imported. Returns valid: false when it is missing, never digested, or changed — re-import those.",
  params: [
    {
      key: "urn",
      label: "URN",
      type: "string",
      required: true,
      hint: "The remote URN the digest was stamped on, e.g. urn:1:<company>:conn_…:/orders/<id>.",
    },
    {
      key: "digest",
      label: "Digest",
      type: "string",
      required: false,
      hint: "A digest from Compute Digest. Leave empty to compute it here from Data and Fields.",
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      required: false,
      hint: "The current remote object, digested here when Digest is empty.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: false,
      hint: 'Dot paths to digest from Data, e.g. ["id", "status", "changed"]. Must match the list used when the digest was stamped.',
    },
  ],
  output: [
    { key: "urn", type: "string", label: "URN" },
    { key: "valid", type: "boolean", label: "Valid (unchanged)" },
    { key: "digest", type: "string", label: "Digest Compared" },
  ],

  async execute(input, ctx) {
    if (typeof input.urn !== "string" || !input.urn) throw new Error("URN is required.");
    let digest = input.digest;
    if (digest !== undefined && digest !== "" && typeof digest !== "string") {
      throw new Error("Digest must be a string.");
    }
    if (!digest) {
      if (input.data === undefined) throw new Error("Pass a Digest, or the Data to compute it from.");
      digest = await computeDigest(input.data, parseFields(input.fields));
    }
    ctx.log("info", "validating urn digest", { urn: input.urn });
    const { valid } = await new CohostClient(ctx).request<{ valid: boolean }>("/rms/urn/digest/validate", {
      method: "POST",
      body: { urn: input.urn, digest },
    });
    return { urn: input.urn, valid: valid === true, digest };
  },
};

export default validateUrnDigest;
