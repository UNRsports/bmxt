import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle"
import { getPickerRowAtHi } from "../tabs/tab-picker-bulk-window"
import {
  computeTabPickerSearchVisibleRowIndices,
  computeTabPickerVisibleRowIndices
} from "../tabs/tab-picker-fold-state"
import { getTabPickerEngine } from "../tabs/engine/store"

/** EN: Tab id at the tabs picker highlight (`hi`) when the engine is mounted. */
export function pickerHiTabId(sessionId: string | undefined): number | undefined {
  if (!sessionId) {
    return undefined
  }
  const engine = getTabPickerEngine(sessionId)
  if (!engine) {
    return undefined
  }
  const state = engine.getState()
  const visible =
    state.searchMode && parsePickerSearchNeedle(state.filterQuery).needle !== ""
      ? computeTabPickerSearchVisibleRowIndices(state.rows, state.filterQuery)
      : computeTabPickerVisibleRowIndices(state.rows)
  const row = getPickerRowAtHi(state.rows, visible, state.hi)
  if (row?.kind === "tab") {
    return row.tabId
  }
  return undefined
}
