import type { TabPickerRow } from "./picker-rows"

/** EN: Stable key for row order / membership; ignores title, url, and other display fields. */
export function tabPickerRowsStructureKey(rows: TabPickerRow[]): string {
  const parts: string[] = []
  for (const row of rows) {
    if (row.kind === "tab") {
      parts.push(`t:${row.tabId}`)
    } else if (row.kind === "window") {
      parts.push(`w:${row.windowId}`)
    } else {
      parts.push(`g:${row.windowId}:${row.groupId}`)
    }
  }
  return parts.join("|")
}
