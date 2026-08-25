/**
 * Forward-compat shim for w6w Triggers.
 *
 * Triggers are specified in w6w-core (`rfcs/trigger.md`, `packages/types/src/trigger.ts`)
 * but are not yet in the published `@w6w/types@0.1.0`. This module mirrors the
 * upstream `TriggerDefinition` + trigger hook contracts verbatim and augments
 * `AppDefinition` with the additive `triggers?` field, so this app compiles today
 * against the published types.
 *
 * DELETE THIS FILE once `@w6w/types` exports `TriggerDefinition` and includes
 * `triggers` on `AppDefinition`, and import those from `@w6w/types` instead.
 */
import type { HookContext, Output, Param } from "@w6w/types";

/** A Trigger's serializable configuration — its metadata minus the hook functions. */
export interface Trigger {
  /** Machine name. Unique within the App. Lowercase, kebab-case. */
  key: string;
  title: string;
  description?: string;
  params?: Param[];
  output?: Output;
  sample?: unknown;
  requiresAuth?: boolean;
}

/** Trigger `onSubscribe` — set up the third-party and return opaque state. */
export type OnSubscribeHook<P = Record<string, unknown>, S = unknown> = (
  input: { params: P; subscriptionId: string; callbackUrl: string; hostUrl: string },
  ctx: HookContext,
) => S | Promise<S>;

/** Trigger `onUnsubscribe` — tear down resources allocated by `onSubscribe`. */
export type OnUnsubscribeHook<P = Record<string, unknown>, S = unknown> = (
  input: { params: P; state: S; subscriptionId: string },
  ctx: HookContext,
) => void | Promise<void>;

/** Trigger `handleIngest` — convert a raw inbound payload into 0..N normalized events. */
export type HandleIngestHook<P = Record<string, unknown>, S = unknown, E = unknown> = (
  input: { raw: unknown; params: P; state: S; subscriptionId: string },
  ctx: HookContext,
) => E[] | Promise<E[]>;

/** A trigger module's default export: config and behavior co-located. */
export interface TriggerDefinition<
  P = Record<string, unknown>,
  E = unknown,
  S = unknown,
> extends Trigger {
  onSubscribe?: OnSubscribeHook<P, S>;
  onUnsubscribe?: OnUnsubscribeHook<P, S>;
  handleIngest: HandleIngestHook<P, S, E>;
}

// deno-lint-ignore no-explicit-any
export type AnyTriggerDefinition = TriggerDefinition<any, any, any>;

// Augment the published AppDefinition with the additive `triggers` field.
declare module "@w6w/types" {
  interface AppDefinition {
    triggers?: AnyTriggerDefinition[];
  }
}
