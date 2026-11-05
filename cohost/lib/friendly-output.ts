/**
 * The `friendly` flag every fetch action carries. Checked, the action's result
 * goes through {@link friendlyData} before it leaves the action — so a `get-order`
 * step hands the next step `costs.total.display` instead of `"USD,5500"`.
 * Unchecked (the default), the result is exactly what the API returned.
 *
 * Applied once in `index.ts` over every `read` / `search` action rather than in
 * each action file, so a new fetch action gets the flag without remembering to.
 */
import type { AnyActionDefinition, Param } from "@w6w/types";
import { friendlyData } from "./friendly.ts";

export const friendlyParam: Param = {
  key: "friendly",
  label: "Friendly Format",
  type: "boolean",
  default: false,
  hint: "Return amounts and dates pre-formatted (e.g. costs.total.display → \"$55\") instead of \"USD,5500\" and ISO strings.",
};

/** Add {@link friendlyParam} to a fetch action; other actions pass through untouched. */
export function withFriendlyOutput(action: AnyActionDefinition): AnyActionDefinition {
  if (action.type !== "read" && action.type !== "search") return action;
  return {
    ...action,
    params: [...(action.params ?? []), friendlyParam],
    async execute(input, ctx) {
      const result = await action.execute(input, ctx);
      return input?.friendly === true ? friendlyData(result) : result;
    },
  };
}
