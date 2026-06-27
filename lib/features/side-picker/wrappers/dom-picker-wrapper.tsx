import type { MutableRefObject } from "react"
import { useCallback } from "react"
import { DomListPickerBody } from "../../dom/dom-list-picker-body"
import { DomPromptRender } from "../../dom/dom-prompt-render"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { DomListCapture } from "../../dom/dom-list-capture"
import { domListPickerHeadline, domListPickerWithHeadline } from "../../setting/i18n/picker-headlines"
import { useUiSettings } from "../../setting/use-ui-settings"
import type { DomPageActiveMode } from "../../dom/page-active-setting"

export type DomPickerWrapperProps = {
  state: DomListPickerState
  jumpActiveMode?: DomPageActiveMode
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  onApprove: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
  onRefreshDomViewport?: (
    state: Extract<DomListPickerState, { kind: "lines" }>
  ) => Promise<DomListCapture | null>
  onApplyDomViewportCapture?: (capture: DomListCapture) => void
}

/** EN: Layer ③B — dom -list (lines vs permission prompt). */
export function DomPickerWrapper({
  state,
  jumpActiveMode = "auto",
  onReturnToPrompt,
  onExitToDetailBar,
  onApprove,
  keyboardActive = false,
  pickerInputRef,
  sessionId,
  onRefreshDomViewport,
  onApplyDomViewportCapture
}: DomPickerWrapperProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const refreshViewport = useCallback(async () => {
    if (state.kind !== "lines" || !onRefreshDomViewport) {
      return null
    }
    return onRefreshDomViewport(state)
  }, [onRefreshDomViewport, state])

  const applyCapture = useCallback(
    (capture: DomListCapture) => {
      onApplyDomViewportCapture?.(capture)
    },
    [onApplyDomViewportCapture]
  )

  if (state.kind === "prompt") {
    return (
      <DomPromptRender
        message={state.message}
        onApprove={onApprove}
        onReturnToPrompt={onReturnToPrompt}
        onExitToDetailBar={onExitToDetailBar}
        keyboardActive={keyboardActive}
        pickerInputRef={pickerInputRef}
      />
    )
  }
  const jumpPaths = state.jumpPaths ?? state.lines.map(() => null)
  const pickerMode = state.pickerMode ?? "normal"
  const headline =
    pickerMode === "with" ? domListPickerWithHeadline(locale) : domListPickerHeadline(locale)
  return (
    <DomListPickerBody
      headline={headline}
      lines={state.lines}
      jumpPaths={jumpPaths}
      headerLineCount={state.headerLineCount ?? state.lines.length}
      targetTabId={state.targetTabId}
      jumpActiveMode={jumpActiveMode}
      pickerMode={pickerMode}
      flavor={state.flavor ?? "--html"}
      onReturnToPrompt={onReturnToPrompt}
      onExitToDetailBar={onExitToDetailBar}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
      onRefreshViewport={pickerMode === "with" ? refreshViewport : undefined}
      onViewportCapture={pickerMode === "with" ? applyCapture : undefined}
    />
  )
}
