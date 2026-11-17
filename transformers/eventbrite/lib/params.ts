import type { Param } from "@w6w/types";

/**
 * `companyId` — the Cohost company a URN belongs to. It is always the calling w6w
 * account, so the field is hidden in Studio and the w6w server fills it from
 * `const.account_id` when a call leaves it out or blank (a value the caller sends wins).
 *
 * The published `@w6w/types` (0.1.0) has no `hidden` on `Param` yet, so the literal is
 * typed with it here and returned as a plain `Param`.
 */
export const companyIdParam = (hint: string): Param => {
  const param: Param & { hidden: boolean } = {
    key: "companyId",
    label: "Company ID",
    type: "string",
    required: true,
    hidden: true,
    default: "{{ const.account_id }}",
    hint,
  };
  return param;
};
