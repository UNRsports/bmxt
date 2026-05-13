import { PlainTextPickerBody } from "../bmxt-window/plain-text-picker-body"

type Props = {
  onExit: () => void
  lines: string[]
}

/**
 * EN: `dom -list` results in the same picker chrome as grep -list (`PlainTextPickerBody`).
 * JA: `grep -list` と同一ピッカークロム（`PlainTextPickerBody` を共有）。
 */
export function DomListPickerOverlay({ onExit, lines }: Props) {
  return (
    <PlainTextPickerBody
      headline="dom -list · ↑↓ · j/k · Esc / close with Esc"
      lines={lines}
      onExit={onExit}
    />
  )
}
