import type { MutableRefObject } from "react"
import { DomListPickerBody } from "../../dom/dom-list-picker-body"
import { DomPromptRender } from "../../dom/dom-prompt-render"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import { domListPickerHeadline } from "../../setting/i18n/picker-headlines"
import { useUiSettings } from "../../setting/use-ui-settings"

export type DomPickerWrapperProps = {
  state: DomListPickerState
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  onApprove: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

/** EN: Layer ③B — dom -list (lines vs permission prompt). */
export function DomPickerWrapper({
  state,
  onReturnToPrompt,
  onExitToDetailBar,
  onApprove,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: DomPickerWrapperProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  if (state.kind === "prompt") {
    return (
      <DomPromptRender
        message={state.message}
        onApprove={onApprove}
        onReturnToPrompt={onReturnToPrompt}
        keyboardActive={keyboardActive}
        pickerInputRef={pickerInputRef}
      />
    )
  }
  const jumpPaths = state.jumpPaths ?? state.lines.map(() => null)
  return (
    <DomListPickerBody
      headline={domListPickerHeadline(locale)}
      lines={state.lines}
      jumpPaths={jumpPaths}
      headerLineCount={state.headerLineCount ?? state.lines.length}
      targetTabId={state.targetTabId}
      onReturnToPrompt={onReturnToPrompt}
      onExitToDetailBar={onExitToDetailBar}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
