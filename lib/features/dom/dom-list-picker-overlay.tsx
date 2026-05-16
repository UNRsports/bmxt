import { PlainTextPickerBody } from "../bmxt-window/plain-text-picker-body"
import { DomListPromptPanel } from "./dom-list-prompt-panel"
import type { DomListPickerState } from "./dom-list-picker-input"

import type { MutableRefObject } from "react"

type Props = {
  state: DomListPickerState
  onReturnToPrompt: () => void
  /** Called when user approved a retry (permission obtained or already granted). */
  onApprove: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

/**
 * EN: `dom -list` results in the same picker chrome as find -list (`PlainTextPickerBody`).
 *     If the handler returned a retryable error, render the permission/retry prompt instead.
 * JA: `find -list` と同一クロムでの一覧表示。リトライ可能なエラー時は確認パネルに切り替える。
 */
export function DomListPickerOverlay({
  state,
  onReturnToPrompt,
  onApprove,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: Props) {
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
      headline="dom -list · ↑↓ · j/k · Ctrl+←→ · Esc → prompt"
      lines={state.lines}
      onReturnToPrompt={onReturnToPrompt}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
