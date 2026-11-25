import type { TabPickerRow } from "./picker-rows.ts"
import type { SelectKind } from "./tab-picker-overlay-types.ts"

/** EN: Same format as `groupRowKey` in tab-picker-keyboard (kept local for node:test). */
function groupRowKey(windowId: number, groupId: number | null): string {
  return `${windowId}:${groupId === null ? "none" : String(groupId)}`
}

export type PickerMarkSnapshot = {
  hi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
}

/**
 * EN: Resolve tab IDs targeted by current mark state (same rules as the picker derived hook).
 *     Order follows picker `rows` (windowId + tab.strip index) — never numeric tab-id sort,
 *     so bulk move / new-window keep visual order.
 * JA: マーク状態から対象タブ ID を解決。順序はピッカー行（ウィンドウ＋タブバー index）に合わせ、
 *     タブ ID 数値ソートはしない（一括移動・新規ウィンドウで表示順を保つ）。
 */
export function computeSelectedTabIdsFromMarks(
  rows: TabPickerRow[],
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[]
): number[] {
  if (markedKind === "tab") {
    const idSet = new Set(markedTabIds)
    const out: number[] = []
    for (const row of rows) {
      if (row.kind === "tab" && idSet.has(row.tabId)) {
        out.push(row.tabId)
      }
    }
    return out
  }
  if (markedKind === "window") {
    const windowSet = new Set(markedWindowIds)
    const out: number[] = []
    for (const row of rows) {
      if (row.kind === "tab" && windowSet.has(row.windowId)) {
        out.push(row.tabId)
      }
    }
    return out
  }
  if (markedKind === "group") {
    const groupSet = new Set(markedGroupKeys)
    const out: number[] = []
    for (const row of rows) {
      if (row.kind !== "tab") {
        continue
      }
      const key = groupRowKey(row.windowId, row.groupId)
      if (groupSet.has(key)) {
        out.push(row.tabId)
      }
    }
    return out
  }
  return []
}

/** EN: Tab IDs for bulk execute when marks are empty but the highlighted row implies a target. */
export function resolvePickerExecutionTabIds(
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  snapshot: PickerMarkSnapshot,
  implicitWindowId?: number
): number[] {
  const fromMarks = computeSelectedTabIdsFromMarks(
    rows,
    snapshot.markedKind,
    snapshot.markedTabIds,
    snapshot.markedWindowIds,
    snapshot.markedGroupKeys
  )
  if (fromMarks.length > 0) {
    return fromMarks
  }
  if (snapshot.markedKind === null && implicitWindowId !== undefined) {
    return computeSelectedTabIdsFromMarks(rows, "window", [], [implicitWindowId], [])
  }
  const rowIndex = visibleRowIndices[snapshot.hi]
  const row = rowIndex !== undefined ? rows[rowIndex] : undefined
  if (!row) {
    return fromMarks
  }
  if (row.kind === "tab") {
    return [row.tabId]
  }
  if (row.kind === "window") {
    return computeSelectedTabIdsFromMarks(rows, "window", [], [row.windowId], [])
  }
  if (row.kind === "group" && row.groupId !== null) {
    return computeSelectedTabIdsFromMarks(
      rows,
      "group",
      [],
      [],
      [groupRowKey(row.windowId, row.groupId)]
    )
  }
  return fromMarks
}
