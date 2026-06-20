import { useCallback, useMemo, useRef, useState } from "react"
import { useUiCopy } from "../setting"
import { groupRowKey } from "./tab-picker-keyboard"
import type { TabPickerRow } from "./picker-rows"
import {
  listTabPickerActions,
  resolveTabActionTargetTabIds,
  tabPickerActionToBulkSubMode,
  TAB_PICKER_ACTION_MESSAGE_KEYS,
  type TabPickerActionId,
  type TabPickerListView
} from "./tab-picker-actions"
import type { BulkSubMode, SelectKind } from "./tab-picker-overlay-types"
import { reducePickerState, type PickerReducerEvent, type PickerReducerState } from "./state-machine"
import {
  executeDuplicateTabsAction,
  executeReloadTabsAction
} from "./controller/execute-actions"

export type TabPickerActionRow = {
  id: TabPickerActionId
  label: string
}

type ActionTargetSnapshot = {
  markedKind: SelectKind | null
  markedTabIds: number[]
  highlightedTabId: number | null
  selectedTabIds: number[]
}

type ApplyReduced = (ev: PickerReducerEvent) => void

export function useTabPickerActionView({
  rows,
  visibleRowIndices,
  hi,
  moveDestHi,
  markedKind,
  markedTabIds,
  markedWindowIds,
  markedGroupKeys,
  bulkSubMode,
  markedCount,
  selectedTabIds,
  hlSearchPattern,
  searchMode,
  groupNewPhase,
  newTabUrlWindowId,
  editPanel,
  applyReducedState,
  setBulkSubMode,
  setHlSearchPattern,
  closeSearch,
  openEditFromPicker,
  executeCloseForReducerState,
  onRefreshRows,
  onAppendLog
}: {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  markedCount: number
  selectedTabIds: number[]
  hlSearchPattern: string
  bulkSubMode: BulkSubMode | null
  searchMode: boolean
  groupNewPhase: "tabs" | "meta"
  newTabUrlWindowId: number | null
  editPanel: unknown
  applyReducedState: ApplyReduced
  setBulkSubMode: (mode: BulkSubMode | null) => void
  setHlSearchPattern: (pattern: string) => void
  closeSearch: () => void
  openEditFromPicker: () => void | Promise<void>
  executeCloseForReducerState: (state: PickerReducerState) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  onAppendLog?: (lines: string[]) => void | Promise<void>
}) {
  const uiCopy = useUiCopy()
  const [pickerView, setPickerView] = useState<TabPickerListView>("list")
  const [actionHi, setActionHi] = useState(0)
  const pickerViewRef = useRef(pickerView)
  pickerViewRef.current = pickerView
  const actionHiRef = useRef(actionHi)
  actionHiRef.current = actionHi
  const actionTargetSnapshotRef = useRef<ActionTargetSnapshot | null>(null)

  const highlightedRow = useMemo(() => {
    const rowIndex = visibleRowIndices[hi]
    return rowIndex !== undefined ? rows[rowIndex] : undefined
  }, [hi, rows, visibleRowIndices])

  const rowKind = useMemo((): "tab" | "window" | "group" | null => {
    if (!highlightedRow) {
      return null
    }
    if (highlightedRow.kind === "tab") {
      return "tab"
    }
    if (highlightedRow.kind === "window") {
      return "window"
    }
    if (highlightedRow.kind === "group") {
      return "group"
    }
    return null
  }, [highlightedRow])

  const actionIds = useMemo(
    () =>
      listTabPickerActions({
        markedKind,
        rowKind,
        hlSearchPattern
      }),
    [hlSearchPattern, markedKind, rowKind]
  )

  const actionRows = useMemo(
    (): TabPickerActionRow[] =>
      actionIds.map((id) => ({
        id,
        label: uiCopy.t(TAB_PICKER_ACTION_MESSAGE_KEYS[id])
      })),
    [actionIds, uiCopy]
  )
  const actionRowsRef = useRef(actionRows)
  actionRowsRef.current = actionRows

  const resolveImmediateTabIds = useCallback((): number[] => {
    return resolveTabActionTargetTabIds({
      markedKind,
      markedTabIds,
      highlightedTabId: highlightedRow?.kind === "tab" ? highlightedRow.tabId : null,
      selectedTabIds
    })
  }, [highlightedRow, markedKind, markedTabIds, selectedTabIds])

  const resolveActionTargetTabIds = useCallback((): number[] => {
    const snapshot = actionTargetSnapshotRef.current
    if (snapshot !== null) {
      return resolveTabActionTargetTabIds(snapshot)
    }
    return resolveImmediateTabIds()
  }, [resolveImmediateTabIds])

  const autoMarkReducerState = useCallback((): PickerReducerState => {
    const base: PickerReducerState = {
      hi,
      moveDestHi,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      bulkSubMode
    }
    if (markedCount > 0 || !highlightedRow) {
      return base
    }
    const row =
      highlightedRow.kind === "tab"
        ? { kind: "tab" as const, tabId: highlightedRow.tabId }
        : highlightedRow.kind === "window"
          ? { kind: "window" as const, windowId: highlightedRow.windowId }
          : highlightedRow.groupId !== null
            ? {
                kind: "group" as const,
                groupKey: groupRowKey(highlightedRow.windowId, highlightedRow.groupId)
              }
            : null
    if (row === null) {
      return base
    }
    return reducePickerState(base, { kind: "toggleCurrent", row })
  }, [
    bulkSubMode,
    highlightedRow,
    hi,
    markedCount,
    markedGroupKeys,
    markedKind,
    markedTabIds,
    markedWindowIds,
    moveDestHi
  ])

  const autoMarkHighlightedRow = useCallback(() => {
    if (markedCount > 0 || !highlightedRow) {
      return
    }
    applyReducedState({
      kind: "toggleCurrent",
      row:
        highlightedRow.kind === "tab"
          ? { kind: "tab", tabId: highlightedRow.tabId }
          : highlightedRow.kind === "window"
            ? { kind: "window", windowId: highlightedRow.windowId }
            : {
                kind: "group",
                groupKey: groupRowKey(highlightedRow.windowId, highlightedRow.groupId)
              }
    })
  }, [applyReducedState, highlightedRow, markedCount])

  const exitActionView = useCallback(() => {
    setPickerView("list")
    setActionHi(0)
  }, [])

  const enterActionView = useCallback(() => {
    if (actionIds.length === 0) {
      return false
    }
    actionTargetSnapshotRef.current = {
      markedKind,
      markedTabIds: [...markedTabIds],
      highlightedTabId: highlightedRow?.kind === "tab" ? highlightedRow.tabId : null,
      selectedTabIds: [...selectedTabIds]
    }
    setActionHi(0)
    setPickerView("actions")
    return true
  }, [
    actionIds.length,
    highlightedRow,
    markedKind,
    markedTabIds,
    selectedTabIds
  ])

  const commitAction = useCallback(
    async (actionId: TabPickerActionId) => {
      const reloadTabIds =
        actionId === "reload" || actionId === "duplicate"
          ? resolveActionTargetTabIds()
          : []

      exitActionView()
      actionTargetSnapshotRef.current = null

      if (actionId === "nohlsearch") {
        setHlSearchPattern("")
        closeSearch()
        return
      }

      if (actionId === "reload") {
        if (reloadTabIds.length === 0) {
          void onAppendLog?.([
            uiCopy.t("tabs.picker.error.reloadFailed", { message: "no target tab" })
          ])
          return
        }
        try {
          await executeReloadTabsAction(reloadTabIds)
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          void onAppendLog?.([uiCopy.t("tabs.picker.error.reloadFailed", { message })])
        }
        return
      }

      if (actionId === "duplicate") {
        if (reloadTabIds.length === 0) {
          void onAppendLog?.([
            uiCopy.t("tabs.picker.error.duplicateFailed", { message: "no target tab" })
          ])
          return
        }
        try {
          await executeDuplicateTabsAction(reloadTabIds)
          await onRefreshRows?.()
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          void onAppendLog?.([uiCopy.t("tabs.picker.error.duplicateFailed", { message })])
        }
        return
      }

      const bulkMode = tabPickerActionToBulkSubMode(actionId)
      if (bulkMode === null) {
        return
      }

      autoMarkHighlightedRow()

      if (bulkMode === "edit") {
        void openEditFromPicker()
        return
      }

      if (bulkMode === "close") {
        const execState = autoMarkReducerState()
        if (markedCount === 0) {
          autoMarkHighlightedRow()
        }
        await executeCloseForReducerState(execState)
        return
      }

      setBulkSubMode(bulkMode)
    },
    [
      autoMarkHighlightedRow,
      autoMarkReducerState,
      closeSearch,
      executeCloseForReducerState,
      exitActionView,
      markedCount,
      onAppendLog,
      onRefreshRows,
      openEditFromPicker,
      uiCopy,
      resolveActionTargetTabIds,
      setBulkSubMode,
      setHlSearchPattern
    ]
  )

  const canEnterActionView =
    pickerView === "list" &&
    !searchMode &&
    bulkSubMode === null &&
    groupNewPhase !== "meta" &&
    newTabUrlWindowId === null &&
    editPanel === null &&
    actionIds.length > 0

  return {
    pickerView,
    pickerViewRef,
    actionHi,
    actionHiRef,
    actionRowsRef,
    setActionHi,
    actionRows,
    enterActionView,
    exitActionView,
    commitAction,
    canEnterActionView
  }
}
