import { displayTitle } from "../format/display-title"
import type { TabPickerRow } from "./picker-rows"

type TabRow = Extract<TabPickerRow, { kind: "tab" }>

/**
 * EN: Apply a title-only Chrome update without rebuilding the full picker row list.
 * JA: `tabs.onUpdated` の title のみを既存 rows に差し込む。
 */
export function patchTabPickerRowsTitle(
  rows: TabPickerRow[],
  tabId: number,
  title: string
): TabPickerRow[] {
  let tabRow: TabRow | undefined
  for (const row of rows) {
    if (row.kind === "tab" && row.tabId === tabId) {
      if (row.title === title) {
        return rows
      }
      tabRow = row
      break
    }
  }
  if (tabRow === undefined) {
    return rows
  }

  return rows.map((row) => {
    if (row.kind === "tab" && row.tabId === tabId) {
      return { ...row, title }
    }
    if (
      row.kind === "window" &&
      row.usesActiveTabTitle &&
      tabRow.active &&
      row.windowId === tabRow.windowId
    ) {
      const windowTitle = displayTitle(title)
      const star = row.focused ? "*" : " "
      return {
        ...row,
        windowTitle,
        label: `${star}[ウィンドウ] ${windowTitle}`
      }
    }
    return row
  })
}
