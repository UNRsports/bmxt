/**
 * EN: Composes tab-order window capture handlers shared by list pickers.
 * JA: リスト系ピッカー共通の window capture チェーン。
 */
import { runPickerCommandEnter, type RunPickerCommandEnterOptions } from "./picker-command-enter"
import { runPickerPaneStripKeydown } from "./picker-pane-strip"
import { runPickerSearchEnter, type RunPickerSearchEnterOptions } from "./picker-search-enter"
import { runPickerSearchJump, type RunPickerSearchJumpOptions } from "./picker-search-jump"

export type PickerWindowCaptureHandlers = {
  paneStrip?: boolean
  verticalNav?: (e: KeyboardEvent) => boolean
  searchJump?: RunPickerSearchJumpOptions
  searchEnter?: RunPickerSearchEnterOptions
  commandEnter?: RunPickerCommandEnterOptions
  customEnter?: (e: KeyboardEvent) => boolean
}

/** EN: Standard capture-phase chain (pane strip → nav → n/N → search Enter → command Enter → custom). */
export function runPickerWindowCaptureChain(
  e: KeyboardEvent,
  sessionId: string,
  handlers: PickerWindowCaptureHandlers
): boolean {
  if (handlers.paneStrip !== false && runPickerPaneStripKeydown(e, sessionId)) {
    return true
  }
  if (handlers.verticalNav?.(e)) {
    return true
  }
  if (handlers.searchJump && runPickerSearchJump(e, handlers.searchJump)) {
    return true
  }
  if (handlers.searchEnter && runPickerSearchEnter(e, handlers.searchEnter)) {
    return true
  }
  if (handlers.commandEnter && runPickerCommandEnter(e, handlers.commandEnter)) {
    return true
  }
  if (handlers.customEnter?.(e)) {
    return true
  }
  return false
}
