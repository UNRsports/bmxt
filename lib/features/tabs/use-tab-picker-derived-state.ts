import { useMemo } from "react"
import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import type { SelectKind } from "./tab-picker-overlay-types"

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

  const selectedTabIds = useMemo(() => {
    if (markedKind === "tab") {
      return markedTabIds
    }
    if (markedKind === "window") {
      const out: number[] = []
      for (const r of rows) {
        if (r.kind === "tab" && markedWindowSet.has(r.windowId)) {
          out.push(r.tabId)
        }
      }
      return out.sort((a, b) => a - b)
    }
    if (markedKind === "group") {
      const out: number[] = []
      for (const r of rows) {
        if (r.kind !== "tab") {
          continue
        }
        const k = groupRowKey(r.windowId, r.groupId)
        if (markedGroupSet.has(k)) {
          out.push(r.tabId)
        }
      }
      return out.sort((a, b) => a - b)
    }
    return []
  }, [markedGroupSet, markedKind, markedTabIds, markedWindowSet, rows])

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
