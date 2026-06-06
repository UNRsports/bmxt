/** EN: In-memory fold state for tab picker (window / group) until BMXt process exit. */
/** JA: タブピッカーの開閉状態（ウィンドウ・グループ）。プロセス終了まで保持。 */

import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"

const collapsedWindowIds = new Set<number>()
const collapsedGroupKeys = new Set<string>()

export function isTabPickerWindowExpanded(windowId: number): boolean {
  return !collapsedWindowIds.has(windowId)
}

export function isTabPickerGroupExpanded(windowId: number, groupId: number | null): boolean {
  return !collapsedGroupKeys.has(groupRowKey(windowId, groupId))
}

function setTabPickerWindowExpanded(windowId: number, expanded: boolean): void {
  if (expanded) {
    collapsedWindowIds.delete(windowId)
  } else {
    collapsedWindowIds.add(windowId)
  }
}

function setTabPickerGroupExpanded(windowId: number, groupId: number | null, expanded: boolean): void {
  const key = groupRowKey(windowId, groupId)
  if (expanded) {
    collapsedGroupKeys.delete(key)
  } else {
    collapsedGroupKeys.add(key)
  }
}

function findWindowRowIndex(rows: TabPickerRow[], windowId: number): number | null {
  const idx = rows.findIndex((r) => r.kind === "window" && r.windowId === windowId)
  return idx >= 0 ? idx : null
}

function findGroupRowIndex(
  rows: TabPickerRow[],
  windowId: number,
  groupId: number | null
): number | null {
  const idx = rows.findIndex(
    (r) => r.kind === "group" && r.windowId === windowId && r.groupId === groupId
  )
  return idx >= 0 ? idx : null
}

/** EN: Indices into `rows` that are visible given current fold state. */
export function computeTabPickerVisibleRowIndices(rows: TabPickerRow[]): number[] {
  const out: number[] = []
  let windowExpanded = true
  let groupExpanded = true

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.kind === "window") {
      windowExpanded = isTabPickerWindowExpanded(r.windowId)
      groupExpanded = true
      out.push(i)
      continue
    }
    if (r.kind === "group") {
      if (!windowExpanded) {
        continue
      }
      groupExpanded = isTabPickerGroupExpanded(r.windowId, r.groupId)
      out.push(i)
      continue
    }
    if (windowExpanded && groupExpanded) {
      out.push(i)
    }
  }
  return out
}

/** EN: Collapse window or group for `row`; returns `rows` index to focus (header). */
export function collapseTabPickerAtRow(rows: TabPickerRow[], row: TabPickerRow): number | null {
  if (row.kind === "window") {
    if (!isTabPickerWindowExpanded(row.windowId)) {
      return findWindowRowIndex(rows, row.windowId)
    }
    setTabPickerWindowExpanded(row.windowId, false)
    return findWindowRowIndex(rows, row.windowId)
  }
  if (row.kind === "group") {
    if (!isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return findGroupRowIndex(rows, row.windowId, row.groupId)
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, false)
    return findGroupRowIndex(rows, row.windowId, row.groupId)
  }
  if (row.kind === "tab") {
    if (!isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return findGroupRowIndex(rows, row.windowId, row.groupId)
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, false)
    return findGroupRowIndex(rows, row.windowId, row.groupId)
  }
  return null
}

/** EN: Expand window or group for `row`; returns `rows` index to focus (header). */
export function expandTabPickerAtRow(rows: TabPickerRow[], row: TabPickerRow): number | null {
  if (row.kind === "window") {
    if (isTabPickerWindowExpanded(row.windowId)) {
      return findWindowRowIndex(rows, row.windowId)
    }
    setTabPickerWindowExpanded(row.windowId, true)
    return findWindowRowIndex(rows, row.windowId)
  }
  if (row.kind === "group") {
    if (isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return findGroupRowIndex(rows, row.windowId, row.groupId)
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, true)
    return findGroupRowIndex(rows, row.windowId, row.groupId)
  }
  if (row.kind === "tab") {
    if (isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return findGroupRowIndex(rows, row.windowId, row.groupId)
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, true)
    return findGroupRowIndex(rows, row.windowId, row.groupId)
  }
  return null
}
