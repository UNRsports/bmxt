import { pickerEnterKey, pickerStopEvent } from "./picker-key-event"

export const PICKER_NOHLSEARCH_COMMAND = "nohlsearch"

export function isPickerNohlsearchCommand(buffer: string): boolean {
  return buffer.trim().toLowerCase() === PICKER_NOHLSEARCH_COMMAND
}

export type RunPickerCommandEnterOptions = {
  commandMode: boolean
  commandBuffer: string
  /** EN: Empty command + Enter — show listing hint. */
  onEmptyEnter?: () => void
  /** EN: `:nohlsearch` — clear highlight; return true if handled. */
  onNohlsearch?: () => void
  /**
   * EN: Other commands after nohlsearch check; return true if consumed Enter.
   * JA: nohlsearch 以外のコマンド確定。
   */
  onCommand?: (buffer: string) => boolean
}

/** EN: `:` mode — Enter on empty (listing), `nohlsearch`, or custom command. */
export function runPickerCommandEnter(
  e: KeyboardEvent,
  opts: RunPickerCommandEnterOptions
): boolean {
  if (!opts.commandMode || !pickerEnterKey(e)) {
    return false
  }
  pickerStopEvent(e)

  if (opts.commandBuffer.trim() === "") {
    opts.onEmptyEnter?.()
    return true
  }

  if (isPickerNohlsearchCommand(opts.commandBuffer)) {
    opts.onNohlsearch?.()
    return true
  }

  if (opts.onCommand?.(opts.commandBuffer)) {
    return true
  }

  return true
}
