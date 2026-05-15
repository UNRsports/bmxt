import { PlainTextPickerBody } from "../bmxt-window/plain-text-picker-body"

type Props = {
  onExit: () => void
  lines: string[]
}

/**
 * EN: `find -list` results in the same picker chrome as tabs (`PlainTextPickerBody` = shared with tab row CSS).
 * JA: tabs と同一ピッカークロム（`PlainTextPickerBody` でタブ行と同系 CSS を共有）。
 */
export function FindListPickerOverlay({ onExit, lines }: Props) {
  return (
    <PlainTextPickerBody
      headline="find -list · ↑↓ · j/k · Esc / close with Esc"
      lines={lines}
      onExit={onExit}
    />
  )
}
