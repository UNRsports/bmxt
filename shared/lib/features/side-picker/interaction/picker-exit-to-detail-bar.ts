/**
 * EN: ← from a picker root list returns to the detail bar / prompt strip.
 *     Part of the shared contract: ← back, → forward (never exit on →).
 * JA: ピッカー根一覧の ← で詳細バー／プロンプト帯へ戻る（→ では退出しない）。
 */

import { pickerArrowLeft } from "./picker-key-event.ts"

export function runPickerExitToDetailBar(
  e: KeyboardEvent,
  canExit: () => boolean,
  onExit: () => void
): boolean {
  if (!pickerArrowLeft(e)) {
    return false
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
    return false
  }
  if (!canExit()) {
    return false
  }
  e.preventDefault()
  e.stopImmediatePropagation()
  onExit()
  return true
}
