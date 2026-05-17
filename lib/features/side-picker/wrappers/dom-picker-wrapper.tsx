import type { MutableRefObject } from "react"
import { DomListPickerBody } from "../../dom/dom-list-picker-body"
import { DomPromptRender } from "../../dom/dom-prompt-render"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import { DOM_LIST_PICKER_HEADLINE } from "../interaction/picker-headlines"

export type DomPickerWrapperProps = {
  state: DomListPickerState
  onReturnToPrompt: () => void
  onApprove: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

/** EN: Layer ③B — dom -list (lines vs permission prompt). */
export function DomPickerWrapper({
  state,
  onReturnToPrompt,
  onApprove,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: DomPickerWrapperProps) {
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
      headline={DOM_LIST_PICKER_HEADLINE}
      lines={state.lines}
      jumpPaths={jumpPaths}
      headerLineCount={state.headerLineCount ?? state.lines.length}
      targetTabId={state.targetTabId}
      onReturnToPrompt={onReturnToPrompt}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
