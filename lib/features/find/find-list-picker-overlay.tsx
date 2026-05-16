import { PlainTextPickerBody } from "../bmxt-window/plain-text-picker-body"

import type { MutableRefObject } from "react"

type Props = {
  onReturnToPrompt: () => void
  lines: string[]
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

/**
 * EN: `find -list` results in the same picker chrome as tabs (`PlainTextPickerBody` = shared with tab row CSS).
 * JA: tabs と同一ピッカークロム（`PlainTextPickerBody` でタブ行と同系 CSS を共有）。
 */
export function FindListPickerOverlay({
  onReturnToPrompt,
  lines,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: Props) {
  return (
    <PlainTextPickerBody
      headline="find -list · ↑↓ · j/k · / highlight · n/N · Ctrl+←→ · Esc → prompt"
      lines={lines}
      onReturnToPrompt={onReturnToPrompt}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
