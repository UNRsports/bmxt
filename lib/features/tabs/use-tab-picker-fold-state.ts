import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle"
import type { TabPickerRow } from "./picker-rows"
import { tabPickerRowsStructureKey } from "./tab-picker-rows-structure"
import {
  beginTabPickerSearchFoldSession,
  cancelTabPickerSearchFoldSession,
  collapseTabPickerAtRow,
  commitTabPickerSearchFoldSession,
  computeTabPickerSearchVisibleRowIndices,
  computeTabPickerVisibleRowIndices,
  expandTabPickerAtRow,
  expandTabPickerForTabId,
  hydrateTabPickerFoldStateFromStorage,
  isTabPickerGroupExpanded,
  isTabPickerWindowExpanded,
  persistTabPickerFoldStateToStorage
} from "./tab-picker-fold-state"

export function useTabPickerFoldState(
  rows: TabPickerRow[],
  searchMode: boolean,
  filterQuery: string
): {
  visibleRowIndices: number[]
  collapseAtRow: (row: TabPickerRow) => number | null
  expandAtRow: (row: TabPickerRow) => number | null
  toggleFoldAtRow: (row: TabPickerRow) => number | null
  expandForTabId: (tabId: number) => boolean
  isWindowExpanded: (windowId: number) => boolean
  isGroupExpanded: (windowId: number, groupId: number | null) => boolean
  commitSearchFoldSession: (query: string) => void
} {
  const [revision, setRevision] = useState(0)
  const bump = useCallback(() => setRevision((r) => r + 1), [])
  const prevSearchModeRef = useRef(searchMode)

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

  useEffect(() => {
    const wasSearch = prevSearchModeRef.current
    if (searchMode && !wasSearch) {
      beginTabPickerSearchFoldSession()
    } else if (!searchMode && wasSearch) {
      const restored = cancelTabPickerSearchFoldSession()
      if (restored) {
        void persistTabPickerFoldStateToStorage()
        bump()
      }
    }
    prevSearchModeRef.current = searchMode
  }, [searchMode, bump])

  const searchActiveNeedle = useMemo(() => {
    if (!searchMode) {
      return ""
    }
    return parsePickerSearchNeedle(filterQuery).needle
  }, [filterQuery, searchMode])

  const rowsStructureKey = useMemo(() => tabPickerRowsStructureKey(rows), [rows])

  const searchVisibleRowIndexSet = useMemo(() => {
    if (searchActiveNeedle === "") {
      return null
    }
    void revision
    return new Set(computeTabPickerSearchVisibleRowIndices(rows, filterQuery))
  }, [filterQuery, revision, rows, searchActiveNeedle])

  const visibleRowIndicesWithoutSearch = useMemo(() => {
    void revision
    return computeTabPickerVisibleRowIndices(rows)
  }, [revision, rowsStructureKey])

  const visibleRowIndicesWithSearch = useMemo(() => {
    void revision
    return computeTabPickerSearchVisibleRowIndices(rows, filterQuery)
  }, [filterQuery, revision, rows, searchActiveNeedle])

  const visibleRowIndices =
    searchActiveNeedle !== "" ? visibleRowIndicesWithSearch : visibleRowIndicesWithoutSearch

  const collapseAtRow = useCallback(
    (row: TabPickerRow): number | null => {
      const { focusRowIdx, changed } = collapseTabPickerAtRow(rows, row)
      if (!changed || focusRowIdx === null) {
        return null
      }
      void persistTabPickerFoldStateToStorage()
      bump()
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

  const expandForTabId = useCallback(
    (tabId: number): boolean => {
      const changed = expandTabPickerForTabId(rows, tabId)
      if (changed) {
        void persistTabPickerFoldStateToStorage()
        bump()
      }
      return changed
    },
    [bump, rows]
  )

  const commitSearchFoldSession = useCallback(
    (query: string) => {
      const changed = commitTabPickerSearchFoldSession(rows, query)
      if (changed) {
        void persistTabPickerFoldStateToStorage()
        bump()
      }
    },
    [bump, rows]
  )

  const isWindowExpanded = useCallback(
    (windowId: number) => {
      if (searchVisibleRowIndexSet !== null) {
        const rowIdx = rows.findIndex((r) => r.kind === "window" && r.windowId === windowId)
        if (rowIdx >= 0 && searchVisibleRowIndexSet.has(rowIdx)) {
          return true
        }
      }
      void revision
      return isTabPickerWindowExpanded(windowId)
    },
    [revision, rows, searchVisibleRowIndexSet]
  )

  const isGroupExpanded = useCallback(
    (windowId: number, groupId: number | null) => {
      if (searchVisibleRowIndexSet !== null) {
        const rowIdx = rows.findIndex(
          (r) => r.kind === "group" && r.windowId === windowId && r.groupId === groupId
        )
        if (rowIdx >= 0 && searchVisibleRowIndexSet.has(rowIdx)) {
          return true
        }
      }
      void revision
      return isTabPickerGroupExpanded(windowId, groupId)
    },
    [revision, rows, searchVisibleRowIndexSet]
  )

  const toggleFoldAtRow = useCallback(
    (row: TabPickerRow): number | null => {
      if (row.kind === "window") {
        if (isWindowExpanded(row.windowId)) {
          return collapseAtRow(row)
        }
        return expandAtRow(row)
      }
      if (row.kind === "group") {
        if (isGroupExpanded(row.windowId, row.groupId)) {
          return collapseAtRow(row)
        }
        return expandAtRow(row)
      }
      return null
    },
    [collapseAtRow, expandAtRow, isGroupExpanded, isWindowExpanded]
  )

  return {
    visibleRowIndices,
    collapseAtRow,
    expandAtRow,
    toggleFoldAtRow,
    expandForTabId,
    isWindowExpanded,
    isGroupExpanded,
    commitSearchFoldSession
  }
}
