/**
 * BMXt コマンドコア — 意味論は Rust/WASM、Chrome API は `lib/features/dispatch` 側。
 */

export { FALLBACK_COMPLETION_CANDIDATES } from "../builtin-commands"
export { runDispatch, dispatchFull, parseDispatchJson } from "./dispatch"
export { allCompletionTokens, canonicalCommandNames, resolveCanonical } from "./registry"
export {
  ensureBmxtCore,
  ensureBmxtCoreFromBytes,
  isBmxtCoreReady,
  wasmClassify,
  wasmComplete,
  wasmCompletionTokens,
  wasmCompoundSegmentEligibility,
  wasmParseCompound,
  wasmParsePipe,
  wasmPlanCompound,
  wasmRun,
  wasmTabsPickerConfirmPlan,
  wasmTabsPickerCreateGroupPlan,
  wasmTabsPickerEnterIntent,
  wasmTabsPickerMovePlan,
  wasmTabsPickerReduce,
  wasmTabsPickerTarget,
  wasmTabsPickerValidateExecute
} from "./wasm-host"
export { runTabsPickerReduce } from "./tabs-picker/reducer"
export { resolveTabsPickerEnterIntent } from "./tabs-picker/intent"
export { validateTabsPickerExecute } from "./tabs-picker/validate"
export { resolveTabsPickerTarget } from "./tabs-picker/target"
export { resolveTabsPickerConfirmPlan, resolveTabsPickerMovePlan } from "./tabs-picker/execute-plan-wasm"
export { resolveTabsPickerCreateGroupPlan } from "./tabs-picker/create-group-plan"
export { resolveTabsPickerHeadline } from "./tabs-picker/headline"
export { resolveTabsPickerPreview } from "./tabs-picker/preview"
export { resolveTabsPickerGroupTarget } from "./tabs-picker/group-target"
export { resolveTabsPickerNewWindowOrder } from "./tabs-picker/new-window"

import { canonicalCommandNames } from "./registry"

let cachedCompletion: string[] | null = null

/** EN: Canonical first-command names only (IME menu / Tab list; alphabetical; no aliases). */
export function getCompletionCandidates(): string[] {
  if (!cachedCompletion) {
    cachedCompletion = canonicalCommandNames()
  }
  return cachedCompletion
}

export function resetCompletionCandidatesCache(): void {
  cachedCompletion = null
}
