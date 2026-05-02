import type { SelectKind } from "./tab-picker-overlay-types"
import type { TabPickerRow } from "./picker-rows"

export function getPickerRowAtHi(
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  hi: number
): TabPickerRow | undefined {
  const ri = visibleRowIndices[hi]
  return ri !== undefined ? rows[ri] : undefined
}

/** validate_execute 用: Tab 未選択でウィンドウ行だけハイライトしているとき */
export function implicitWindowIdFromPickerHi(
  markedKind: SelectKind | null,
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  hi: number
): number | undefined {
  if (markedKind !== null) {
    return undefined
  }
  const row = getPickerRowAtHi(rows, visibleRowIndices, hi)
  return row?.kind === "window" ? row.windowId : undefined
}

/** close / newTab URL 開始時の対象ウィンドウ */
export function resolveTargetWindowIdForWindowBulk(
  markedKind: SelectKind | null,
  markedWindowIds: number[],
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  hi: number
): number | null {
  const row = getPickerRowAtHi(rows, visibleRowIndices, hi)
  if (markedKind === "window") {
    if (row?.kind === "window" && markedWindowIds.includes(row.windowId)) {
      return row.windowId
    }
    return markedWindowIds[0] ?? null
  }
  if (row?.kind === "window") {
    return row.windowId
  }
  return null
}
