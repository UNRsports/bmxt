import { useMemo } from "react"
import type { TabPickerRow } from "./picker-rows"
import type { SelectKind } from "./tab-picker-overlay-types"
import { computeSelectedTabIdsFromMarks } from "./picker-selected-tab-ids"

export function useTabPickerDerivedState(
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[]
): {
  markedTabSet: Set<number>
  markedWindowSet: Set<number>
  markedGroupSet: Set<string>
  tabIdToWindowId: Map<number, number>
  selectedTabIds: number[]
} {
  const markedTabSet = useMemo(() => new Set(markedTabIds), [markedTabIds])
  const markedWindowSet = useMemo(() => new Set(markedWindowIds), [markedWindowIds])
  const markedGroupSet = useMemo(() => new Set(markedGroupKeys), [markedGroupKeys])

  const tabIdToWindowId = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of rows) {
      if (r.kind === "tab") {
        m.set(r.tabId, r.windowId)
      }
    }
    return m
  }, [rows])

  const selectedTabIds = useMemo(
    () =>
      computeSelectedTabIdsFromMarks(
        rows,
        markedKind,
        markedTabIds,
        markedWindowIds,
        markedGroupKeys
      ),
    [markedGroupKeys, markedKind, markedTabIds, markedWindowIds, rows]
  )

  return {
    markedTabSet,
    markedWindowSet,
    markedGroupSet,
    tabIdToWindowId,
    selectedTabIds
  }
}

/** markedKind とマーク配列から件数を得る（Reducer の bulk 解除判定用） */
export function pickerMarkedCount(
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[]
): number {
  if (markedKind === "tab") {
    return markedTabIds.length
  }
  if (markedKind === "window") {
    return markedWindowIds.length
  }
  if (markedKind === "group") {
    return markedGroupKeys.length
  }
  return 0
}
