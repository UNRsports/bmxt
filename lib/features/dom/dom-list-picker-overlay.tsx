import { PlainTextPickerBody } from "../bmxt-window/plain-text-picker-body"
import { DomListPromptPanel } from "./dom-list-prompt-panel"
import type { DomListPickerState } from "./dom-list-picker-input"

type Props = {
  state: DomListPickerState
  onExit: () => void
  /** Called when user approved a retry (permission obtained or already granted). */
  onApprove: () => void
}

/**
 * EN: `dom -list` results in the same picker chrome as grep -list (`PlainTextPickerBody`).
 *     If the handler returned a retryable error, render the permission/retry prompt instead.
 * JA: `grep -list` と同一クロムでの一覧表示。リトライ可能なエラー時は確認パネルに切り替える。
 */
export function DomListPickerOverlay({ state, onExit, onApprove }: Props) {
  if (state.kind === "prompt") {
    return (
      <DomListPromptPanel
        message={state.message}
        onApprove={onApprove}
        onDecline={onExit}
      />
    )
  }
  return (
    <PlainTextPickerBody
      headline="dom -list · ↑↓ · j/k · Esc / close with Esc"
      lines={state.lines}
      onExit={onExit}
    />
  )
}
