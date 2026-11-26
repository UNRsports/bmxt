/**
 * EN: MOVE-mode destination = insert *slot between tabs*, not “onto” a tab row.
 * JA: MOVE モードの移動先はタブ行そのものではなく、タブとタブの間の挿入スロット。
 *
 * Mapping (↑↓ still walks visible rows):
 * - tab row → gap immediately above that tab (`--before-tab`)
 * - group row → gap above the first tab in that group (join group); else end of group
 * - window row → gap after the last tab in that window (append)
 */

import type { TabPickerRow } from "./picker-rows.ts"

export type MoveInsertMarker = {
  /** Index into full `rows` (same as row-list `i`). */
  rowIndex: number
  place: "before" | "after"
}

export type MoveInsertSlot = {
  windowId: number
  /** Insert immediately before this tab; `null` = end of window. */
  beforeTabId: number | null
  /** Join after move; `null` with `ungroup:false` = leave membership unchanged. */
  groupId: number | null
  ungroup: boolean
  marker: MoveInsertMarker
}

function firstTabInGroup(
  rows: readonly TabPickerRow[],
  windowId: number,
  groupId: number
): Extract<TabPickerRow, { kind: "tab" }> | null {
  for (const row of rows) {
    if (row.kind === "tab" && row.windowId === windowId && row.groupId === groupId) {
      return row
    }
  }
  return null
}

function lastTabInWindow(
  rows: readonly TabPickerRow[],
  windowId: number
): Extract<TabPickerRow, { kind: "tab" }> | null {
  let last: Extract<TabPickerRow, { kind: "tab" }> | null = null
  for (const row of rows) {
    if (row.kind === "tab" && row.windowId === windowId) {
      last = row
    }
  }
  return last
}

function rowIndexOfTab(rows: readonly TabPickerRow[], tabId: number): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row?.kind === "tab" && row.tabId === tabId) {
      return i
    }
  }
  return -1
}

/**
 * EN: Resolve insert slot + picker marker from MOVE cursor (`moveDestHi` in visible rows).
 * JA: MOVE カーソル（可視行の `moveDestHi`）から挿入スロットとマーカー位置を解決する。
 */
export function resolveMoveInsertSlot(
  rows: readonly TabPickerRow[],
  visibleRowIndices: readonly number[],
  moveDestHi: number
): MoveInsertSlot | null {
  if (rows.length === 0 || visibleRowIndices.length === 0) {
    return null
  }
  if (!Number.isInteger(moveDestHi) || moveDestHi < 0 || moveDestHi >= visibleRowIndices.length) {
    return null
  }
  const destRowIndex = visibleRowIndices[moveDestHi]
  if (destRowIndex === undefined || destRowIndex < 0 || destRowIndex >= rows.length) {
    return null
  }
  const dest = rows[destRowIndex]
  if (dest === undefined) {
    return null
  }

  if (dest.kind === "tab") {
    const groupId = dest.groupId
    return {
      windowId: dest.windowId,
      beforeTabId: dest.tabId,
      groupId: groupId !== null && groupId >= 0 ? groupId : null,
      ungroup: groupId === null || groupId < 0,
      marker: { rowIndex: destRowIndex, place: "before" }
    }
  }

  const visibleSet = new Set(visibleRowIndices)

  if (dest.kind === "group") {
    const groupId = dest.groupId
    if (groupId === null || groupId < 0) {
      return null
    }
    const first = firstTabInGroup(rows, dest.windowId, groupId)
    if (first !== null) {
      const firstIndex = rowIndexOfTab(rows, first.tabId)
      // EN: If the group is folded, keep the marker on the visible group row.
      const markerOnFirst = firstIndex >= 0 && visibleSet.has(firstIndex)
      return {
        windowId: dest.windowId,
        beforeTabId: first.tabId,
        groupId,
        ungroup: false,
        marker: markerOnFirst
          ? { rowIndex: firstIndex, place: "before" }
          : { rowIndex: destRowIndex, place: "after" }
      }
    }
    return {
      windowId: dest.windowId,
      beforeTabId: null,
      groupId,
      ungroup: false,
      marker: { rowIndex: destRowIndex, place: "after" }
    }
  }

  if (dest.kind === "window") {
    const last = lastTabInWindow(rows, dest.windowId)
    if (last !== null) {
      const lastIndex = rowIndexOfTab(rows, last.tabId)
      const markerOnLast = lastIndex >= 0 && visibleSet.has(lastIndex)
      return {
        windowId: dest.windowId,
        beforeTabId: null,
        groupId: null,
        ungroup: false,
        marker: markerOnLast
          ? { rowIndex: lastIndex, place: "after" }
          : { rowIndex: destRowIndex, place: "after" }
      }
    }
    return {
      windowId: dest.windowId,
      beforeTabId: null,
      groupId: null,
      ungroup: false,
      marker: { rowIndex: destRowIndex, place: "after" }
    }
  }

  return null
}

/** EN: Marker lookup for row-list rendering (O(1) compare). */
export function moveInsertMarkerAt(
  slot: MoveInsertSlot | null,
  rowIndex: number,
  place: "before" | "after"
): boolean {
  if (slot === null) {
    return false
  }
  return slot.marker.rowIndex === rowIndex && slot.marker.place === place
}

/**
 * EN: When `--before-tab` points at a tab that is itself being moved, the effect drops
 *     that id from movers and the insert index collapses. Walk forward in picker order
 *     within the same window to the next non-moving tab; if none, append (`null`).
 * JA: 移動対象自身が `--before-tab` だと effect 側で除外され挿入が崩れる。
 *     同一ウィンドウで picker 順の次の非移動タブへずらす。無ければ末尾（`null`）。
 */
export function resolveBeforeTabIdOutsideMovers(
  rows: readonly TabPickerRow[],
  beforeTabId: number | null,
  movingTabIds: readonly number[]
): number | null {
  if (beforeTabId === null) {
    return null
  }
  const moving = new Set(
    movingTabIds.filter((id) => Number.isFinite(id) && id >= 0)
  )
  if (!moving.has(beforeTabId)) {
    return beforeTabId
  }
  let start = -1
  let windowId = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row?.kind === "tab" && row.tabId === beforeTabId) {
      start = i
      windowId = row.windowId
      break
    }
  }
  if (start < 0 || windowId < 0) {
    return null
  }
  for (let i = start + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row === undefined) {
      continue
    }
    if (row.kind === "window") {
      break
    }
    if (row.kind !== "tab" || row.windowId !== windowId) {
      continue
    }
    if (!moving.has(row.tabId)) {
      return row.tabId
    }
  }
  return null
}
