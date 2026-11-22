/**
 * Forward-compat shim for w6w dynamic fields (`resolveFields`).
 *
 * Dynamic fields are specified upstream (`docs/dynamic-fields.md`, the Param and Action RFCs,
 * `packages/types/src/{hooks,param}.ts`) but are not in the published `@w6w/types@0.1.0`. This
 * module mirrors the upstream contracts verbatim and augments `Param`, `DynamicOptions` and
 * `ActionDefinition` with the additive fields, so this app compiles today against the published
 * types. The trigger side lives on the `TriggerDefinition` shim in `w6w-triggers.ts`.
 *
 * DELETE THIS FILE once `@w6w/types` exports `ResolveFieldsHook` and carries `config`,
 * `refreshOn` and `resolveFields`, and import those from `@w6w/types` instead.
 */
import type { HookContext, Option } from "@w6w/types";

/** What the editor knows when it asks for options: the form's literal values only. */
export interface ResolveFieldsInput {
  reason: "init" | "change";
  /** Literal values only; expressions, secrets and var bindings are omitted. */
  form: Record<string, unknown>;
  /** reason "change": the form before the commit. */
  previous?: Record<string, unknown>;
  /** reason "change": the keys just committed. */
  changed?: string[];
  /** The dynamic keys the host wants options for. */
  fields: string[];
  /** Keys whose value is an expression / secret / var. */
  unresolved: string[];
}

export interface ResolveFieldsOutput {
  fields: Record<string, { options?: Option[]; error?: string }>;
}

/** One hook per form, populating every `options: { source: "resolveFields" }` param. */
export type ResolveFieldsHook = (
  input: ResolveFieldsInput,
  ctx: HookContext,
) => ResolveFieldsOutput | Promise<ResolveFieldsOutput>;

declare module "@w6w/types" {
  interface Param {
    /** Type-specific render/behavior options. `allowCustom` makes a dynamic field a combobox. */
    config?: { allowCustom?: boolean };
  }

  interface DynamicOptions {
    /** Sibling param keys whose commit refetches this field's options. Never disables the field. */
    refreshOn?: string[];
  }

  interface ActionDefinition<P, O> {
    /** Fills the action's `source: "resolveFields"` params while the user edits the form. */
    resolveFields?: ResolveFieldsHook;
  }
}
