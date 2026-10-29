import type { ConversionContext } from "./context.ts";

/** Validate source metadata independently of the resource being converted. */
export function validateConversionContext(context: ConversionContext): void {
  if (!context || typeof context !== "object") {
    throw new TypeError("context: Expected source invocation metadata.");
  }
  for (const key of ["companyId", "app", "version", "action", "connectionId"] as const) {
    if (typeof context[key] !== "string" || !context[key].trim()) {
      throw new TypeError(`context.${key}: Expected a non-empty string.`);
    }
  }
  for (const key of ["companyId", "connectionId"] as const) {
    if (!/^[A-Za-z0-9._-]+$/.test(context[key])) {
      throw new TypeError(`context.${key}: Expected letters, digits, dots, underscores, or hyphens.`);
    }
  }
}

/**
 * Build a deterministic source URN for offline files:
 * urn:1:<companyId>:<connectionId>:<resourcePath>
 *
 * The company owns the resource; the connection identifies its service.
 * App, app version, and action are invocation metadata, not resource identity.
 * Pass a canonical absolute path with each resource ID encoded as one segment.
 */
export function generateUrn(resourcePath: string, context: ConversionContext): string {
  validateConversionContext(context);
  if (typeof resourcePath !== "string" || !resourcePath.startsWith("/") ||
      resourcePath === "/" || /[\s?#]/.test(resourcePath) ||
      resourcePath.split("/").slice(1).some(segment => !segment || segment === "." || segment === "..")) {
    throw new TypeError("resourcePath: Expected a canonical absolute resource path without a query or fragment.");
  }
  return `urn:1:${context.companyId}:${context.connectionId}:${resourcePath}`;
}
