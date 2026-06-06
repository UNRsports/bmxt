import { useCallback, useEffect, useMemo, useState } from "react"
import type { TabPickerRow } from "./picker-rows"
import {
  collapseTabPickerAtRow,
  computeTabPickerVisibleRowIndices,
  expandTabPickerAtRow,
  hydrateTabPickerFoldStateFromStorage,
  isTabPickerGroupExpanded,
  isTabPickerWindowExpanded,
  persistTabPickerFoldStateToStorage
} from "./tab-picker-fold-state"

export function useTabPickerFoldState(rows: TabPickerRow[]): {
  visibleRowIndices: number[]
  collapseAtRow: (row: TabPickerRow) => number | null
  expandAtRow: (row: TabPickerRow) => number | null
  isWindowExpanded: (windowId: number) => boolean
  isGroupExpanded: (windowId: number, groupId: number | null) => boolean
} {
  const [revision, setRevision] = useState(0)
  const bump = useCallback(() => setRevision((r) => r + 1), [])

  useEffect(() => {
    let cancelled = false
    void hydrateTabPickerFoldStateFromStorage().then(() => {
      if (!cancelled) {
        bump()
      }
    })
    return () => {
      cancelled = true
    }
  }, [bump])

  const visibleRowIndices = useMemo(() => {
    void revision
    return computeTabPickerVisibleRowIndices(rows)
  }, [rows, revision])

  const collapseAtRow = useCallback(
    (row: TabPickerRow): number | null => {
      const { focusRowIdx, changed } = collapseTabPickerAtRow(rows, row)
      if (focusRowIdx === null) {
        return null
      }
      if (changed) {
        void persistTabPickerFoldStateToStorage()
        bump()
      }
      return focusRowIdx
    },
    [bump, rows]
  )

  const expandAtRow = useCallback(
    (row: TabPickerRow): number | null => {
      const { focusRowIdx, changed } = expandTabPickerAtRow(rows, row)
      if (focusRowIdx === null) {
        return null
      }
      if (changed) {
        void persistTabPickerFoldStateToStorage()
        bump()
      }
      return focusRowIdx
    },
    [bump, rows]
  )

  const isWindowExpanded = useCallback(
    (windowId: number) => {
      void revision
      return isTabPickerWindowExpanded(windowId)
    },
    [revision]
  )

  const isGroupExpanded = useCallback(
    (windowId: number, groupId: number | null) => {
      void revision
      return isTabPickerGroupExpanded(windowId, groupId)
    },
    [revision]
  )

  return {
    visibleRowIndices,
    collapseAtRow,
    expandAtRow,
    isWindowExpanded,
    isGroupExpanded
  }
}
