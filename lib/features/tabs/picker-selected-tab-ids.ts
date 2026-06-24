import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import type { SelectKind } from "./tab-picker-overlay-types"

export type PickerMarkSnapshot = {
  hi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
}

/** EN: Resolve tab IDs targeted by current mark state (same rules as the picker derived hook). */
export function computeSelectedTabIdsFromMarks(
  rows: TabPickerRow[],
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[]
): number[] {
  if (markedKind === "tab") {
    return [...markedTabIds].sort((a, b) => a - b)
  }
  if (markedKind === "window") {
    const windowSet = new Set(markedWindowIds)
    const out: number[] = []
    for (const row of rows) {
      if (row.kind === "tab" && windowSet.has(row.windowId)) {
        out.push(row.tabId)
      }
    }
    return out.sort((a, b) => a - b)
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
    return out.sort((a, b) => a - b)
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
