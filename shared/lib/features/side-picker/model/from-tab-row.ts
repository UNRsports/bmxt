import type { TabPickerRow } from "../../tabs/picker-rows"
import type { PickerEntry } from "./picker-entry"

/** EN: Map a tab row to a URL picker entry (window/group rows → null). */
export function pickerEntryFromTabRow(row: TabPickerRow): PickerEntry | null {
  if (row.kind !== "tab") {
    return null
  }
  const url = (row.url || "").trim()
  if (!url) {
    return null
  }
  return {
    id: `tab-${row.tabId}`,
    source: "tab",
    title: row.title,
    url,
    tabId: row.tabId,
    windowId: row.windowId,
    groupId: row.groupId
  }
}

export function pickerEntryAtVisibleHi(
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  hi: number
): PickerEntry | null {
  const rowIndex = visibleRowIndices[hi]
  if (rowIndex === undefined) {
    return null
  }
  const row = rows[rowIndex]
  if (!row) {
    return null
  }
  return pickerEntryFromTabRow(row)
}
