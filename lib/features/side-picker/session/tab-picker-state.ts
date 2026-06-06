import type { TabPickerRow } from "../../tabs/picker-rows"
import type { SelectKind } from "../../tabs/tab-picker-overlay-types"

/** EN: Restorable tab picker navigation / marks (rows rebuilt on hydrate). */
export type TabPickerInteractiveSnapshot = {
  anchorTabId: number | null
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  hlSearchPattern: string
}

/** EN: Open tab picker column state for one session leaf. */
export type TabPickerState = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
  interactive?: TabPickerInteractiveSnapshot
}

export function emptyTabPickerInteractiveSnapshot(): TabPickerInteractiveSnapshot {
  return {
    anchorTabId: null,
    markedKind: null,
    markedTabIds: [],
    markedWindowIds: [],
    markedGroupKeys: [],
    hlSearchPattern: ""
  }
}
