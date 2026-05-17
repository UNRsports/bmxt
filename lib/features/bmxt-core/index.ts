/**
 * BMXt コマンドコア（TypeScript）。Chrome API は `lib/features/dispatch` 側。
 */

export { FALLBACK_COMPLETION_CANDIDATES } from "../builtin-commands"
export { runDispatch, dispatchFull, parseDispatchJson } from "./dispatch"
export { allCompletionTokens, canonicalCommandNames, resolveCanonical } from "./registry"
export { runTabsPickerReduce } from "./tabs-picker/reducer"
export { resolveTabsPickerEnterIntent } from "./tabs-picker/intent"
export { resolveTabsPickerPreview } from "./tabs-picker/preview"
export { validateTabsPickerExecute } from "./tabs-picker/validate"
export { resolveTabsPickerTarget } from "./tabs-picker/target"
export { resolveTabsPickerGroupTarget } from "./tabs-picker/group-target"
export { resolveTabsPickerNewWindowOrder } from "./tabs-picker/new-window"
export { resolveTabsPickerConfirmPlan, resolveTabsPickerMovePlan } from "./tabs-picker/execute-plan"
export { resolveTabsPickerCreateGroupPlan } from "./tabs-picker/create-group-plan"
export { resolveTabsPickerHeadline } from "./tabs-picker/headline"

import { canonicalCommandNames } from "./registry"

let cachedCompletion: string[] | null = null

/** 互換のため残す（WASM 初期化は不要）。 */
export async function ensureBmxtCore(): Promise<void> {}

export function getCompletionCandidates(): string[] {
  if (!cachedCompletion) {
    cachedCompletion = canonicalCommandNames()
  }
  return cachedCompletion
}
