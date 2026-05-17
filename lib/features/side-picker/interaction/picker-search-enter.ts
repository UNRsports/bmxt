import { pickerEnterKey, pickerStopEvent } from "./picker-key-event"

export type RunPickerSearchEnterOptions = {
  searchMode: boolean
  filterQuery: string
  onCommit: (pattern: string) => void
}

/** EN: `/` mode — Enter commits the filter string as the highlight pattern. */
export function runPickerSearchEnter(
  e: KeyboardEvent,
  opts: RunPickerSearchEnterOptions
): boolean {
  if (!opts.searchMode || !pickerEnterKey(e)) {
    return false
  }
  pickerStopEvent(e)
  opts.onCommit(opts.filterQuery)
  return true
}
