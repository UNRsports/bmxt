import type { MutableRefObject } from "react"
import { DomPromptRender } from "../../dom/dom-prompt-render"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import { DOM_LIST_PICKER_HEADLINE } from "../interaction/picker-headlines"
import { PlainTextPickerBody } from "../plain/plain-text-picker-body"

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
  return (
    <PlainTextPickerBody
      headline={DOM_LIST_PICKER_HEADLINE}
      lines={state.lines}
      onReturnToPrompt={onReturnToPrompt}
      enableCommandMode
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
