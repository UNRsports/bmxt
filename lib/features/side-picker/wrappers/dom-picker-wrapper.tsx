import type { MutableRefObject } from "react"
import { DomListPromptPanel } from "../../dom/dom-list-prompt-panel"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
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
      <DomListPromptPanel
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
      headline="dom -list · ↑↓ · j/k · / · :nohlsearch · n/N · Ctrl+←→ · Esc → prompt"
      lines={state.lines}
      onReturnToPrompt={onReturnToPrompt}
      enableCommandMode
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
