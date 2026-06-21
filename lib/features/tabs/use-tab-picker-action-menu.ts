import { useCallback } from "react"
import {
  actionMenuItemAtPickIndex,
  actionMenuItemsForKind
} from "./tab-picker-overlay-constants"
import type { ActionMenuPanel, BulkSubMode, SelectKind } from "./tab-picker-overlay-types"
import {
  buildActionMenuPanel,
  resolveActionMenuTabLabels,
  resolveActionMenuTargetKind
} from "./tab-picker-action-menu"
import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import type { PickerReducerEvent } from "./state-machine"

export type TabPickerActionMenuParams = {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  markedCount: number
  actionMenuPanel: ActionMenuPanel | null
  setActionMenuPanel: (v: ActionMenuPanel | null) => void
  setBulkSubMode: (v: BulkSubMode | null) => void
  applyReducedState: (ev: PickerReducerEvent) => void
  openEditFromPicker: () => void | Promise<void>
}

export function useTabPickerActionMenu(p: TabPickerActionMenuParams) {
  const {
    rows,
    visibleRowIndices,
    hi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    markedCount,
    actionMenuPanel,
    setActionMenuPanel,
    setBulkSubMode,
    applyReducedState,
    openEditFromPicker
  } = p

  const closeActionMenu = useCallback(() => {
    setActionMenuPanel(null)
  }, [setActionMenuPanel])

  const markHighlightedRowIfNeeded = useCallback(() => {
    if (markedCount > 0) {
      return
    }
    const rowIndex = visibleRowIndices[hi]
    const row = rowIndex !== undefined ? rows[rowIndex] : undefined
    if (!row) {
      return
    }
    if (row.kind === "tab") {
      applyReducedState({ kind: "toggleCurrent", row: { kind: "tab", tabId: row.tabId } })
    } else if (row.kind === "window") {
      applyReducedState({
        kind: "toggleCurrent",
        row: { kind: "window", windowId: row.windowId }
      })
    } else if (row.kind === "group" && row.groupId !== null) {
      applyReducedState({
        kind: "toggleCurrent",
        row: { kind: "group", groupKey: groupRowKey(row.windowId, row.groupId) }
      })
    }
  }, [applyReducedState, hi, markedCount, rows, visibleRowIndices])

  const openActionMenuFromPicker = useCallback(() => {
    const rowIndex = visibleRowIndices[hi]
    const row = rowIndex !== undefined ? rows[rowIndex] : undefined
    const targetKind = resolveActionMenuTargetKind(markedKind, row)
    if (!targetKind) {
      return
    }
    const tabLabels = resolveActionMenuTabLabels(
      rows,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      row
    )
    setActionMenuPanel(buildActionMenuPanel(targetKind, tabLabels))
  }, [
    hi,
    markedGroupKeys,
    markedKind,
    markedTabIds,
    markedWindowIds,
    rows,
    setActionMenuPanel,
    visibleRowIndices
  ])

  const cycleActionMenuPick = useCallback(
    (delta: number) => {
      if (!actionMenuPanel) {
        return
      }
      const len = actionMenuItemsForKind(actionMenuPanel.targetKind).length
      const next = (((actionMenuPanel.pickIndex + delta) % len) + len) % len
      setActionMenuPanel({ ...actionMenuPanel, pickIndex: next })
    },
    [actionMenuPanel, setActionMenuPanel]
  )

  const confirmActionMenuPick = useCallback(async () => {
    if (!actionMenuPanel) {
      return
    }
    const actionId = actionMenuItemAtPickIndex(
      actionMenuPanel.targetKind,
      actionMenuPanel.pickIndex
    )
    if (actionId === null) {
      return
    }
    setActionMenuPanel(null)
    if (actionId === "edit") {
      void openEditFromPicker()
      return
    }
    markHighlightedRowIfNeeded()
    setBulkSubMode(actionId)
  }, [
    actionMenuPanel,
    markHighlightedRowIfNeeded,
    openEditFromPicker,
    setActionMenuPanel,
    setBulkSubMode
  ])

  return {
    openActionMenuFromPicker,
    closeActionMenu,
    cycleActionMenuPick,
    confirmActionMenuPick
  }
}
