declare module "../../../assets/wasm/bmxt-core/bmxt_core.js" {
  const init: (input?: URL | Request | string | WebAssembly.Module | BufferSource) => Promise<void>

  export function completionCandidatesJson(): string
  export function dispatchFull(line: string): string
  export function tabsPickerReduce(stateJson: string, eventJson: string): string
  export function tabsPickerResolveEnterIntent(contextJson: string): string
  export function tabsPickerResolvePreview(contextJson: string): string
  export function tabsPickerValidateExecute(contextJson: string): string
  export function tabsPickerResolveTarget(contextJson: string): string
  export function tabsPickerResolveGroupTarget(contextJson: string): string
  export function tabsPickerResolveNewWindowOrder(contextJson: string): string
  export function tabsPickerResolveConfirmPlan(contextJson: string): string
  export function tabsPickerResolveMovePlan(contextJson: string): string
  export function tabsPickerResolveCreateGroupPlan(contextJson: string): string
  export function tabsPickerResolveHeadline(contextJson: string): string

  export default init
}
