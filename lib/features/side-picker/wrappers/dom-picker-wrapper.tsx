import type { MutableRefObject } from "react"
import { DomListPickerBody } from "../../dom/dom-list-picker-body"
import { DomPromptRender } from "../../dom/dom-prompt-render"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import { domListPickerHeadline } from "../../setting/i18n/picker-headlines"
import { useUiCopy } from "../../setting"

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
  const uiCopy = useUiCopy()
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
      headline={domListPickerHeadline(uiCopy.locale)}
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
