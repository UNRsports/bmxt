import { useCallback } from "react"
import type { ExecutionIntent } from "./controller/execute-actions"
import {
  actionMenuItemAtPickIndex,
  actionMenuItemsForKind
} from "./tab-picker-overlay-constants"
import type {
  ActionMenuItemId,
  ActionMenuPanel,
  BulkSubMode,
  SelectKind
} from "./tab-picker-overlay-types"
import { buildActionMenuPanel, resolveActionMenuTabTargets, resolveActionMenuTargetKind } from "./tab-picker-action-menu"
import type { TabPickerEngineDispatch } from "./engine/types"
import { getPickerRowAtHi, resolveTargetWindowIdForWindowBulk } from "./tab-picker-bulk-window"
import {
  resolvePickerExecutionTabIds
} from "./picker-selected-tab-ids"
import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import { reducePickerState, type PickerReducerEvent, type PickerReducerState } from "./state-machine"
import type { EditPickerSnapshot } from "./use-tab-picker-edit"

const IMMEDIATE_MENU_ACTIONS = new Set<ActionMenuItemId>(["close", "reload", "newWindow"])

function toggleEventForRow(row: TabPickerRow): PickerReducerEvent | null {
  if (row.kind === "tab") {
    return { kind: "toggleCurrent", row: { kind: "tab", tabId: row.tabId } }
  }
  if (row.kind === "window") {
    return { kind: "toggleCurrent", row: { kind: "window", windowId: row.windowId } }
  }
  if (row.kind === "group" && row.groupId !== null) {
    return {
      kind: "toggleCurrent",
      row: { kind: "group", groupKey: groupRowKey(row.windowId, row.groupId) }
    }
  }
  return null
}

function pickerSliceFromParams(p: {
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bulkSubMode: BulkSubMode | null
}): PickerReducerState {
  return {
    hi: p.hi,
    moveDestHi: p.moveDestHi,
    markedKind: p.markedKind,
    markedTabIds: p.markedTabIds,
    markedWindowIds: p.markedWindowIds,
    markedGroupKeys: p.markedGroupKeys,
    bulkSubMode: p.bulkSubMode
  }
}

function applyImplicitMark(
  slice: PickerReducerState,
  row: TabPickerRow | undefined,
  markedCount: number
): PickerReducerState {
  if (markedCount > 0 || !row) {
    return slice
  }
  const toggle = toggleEventForRow(row)
  if (toggle === null) {
    return slice
  }
  return reducePickerState(slice, toggle)
}

function intentForImmediateAction(actionId: ActionMenuItemId): ExecutionIntent | null {
  switch (actionId) {
    case "close":
      return "executeClose"
    case "reload":
      return "executeReload"
    case "newWindow":
      return "executeNewWindow"
    default:
      return null
  }
}

export type TabPickerActionMenuParams = {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  markedCount: number
  bulkSubMode: BulkSubMode | null
  actionMenuPanel: ActionMenuPanel | null
  dispatch: TabPickerEngineDispatch
  setNewTabUrlWindowId: (windowId: number | null) => void
  setNewTabUrl: (url: string) => void
  openEditFromPicker: (snapshot?: EditPickerSnapshot) => void | Promise<void>
  runSnapshotSaveForTabIds: (tabIds: readonly number[]) => Promise<void>
  runExecutionIntentForSnapshot: (
    intent: ExecutionIntent,
    snapshot: PickerReducerState,
    selectedTabIds: number[]
  ) => Promise<void>
}

export function useTabPickerActionMenu(p: TabPickerActionMenuParams) {
  const {
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    markedCount,
    bulkSubMode,
    actionMenuPanel,
    dispatch,
    setNewTabUrlWindowId,
    setNewTabUrl,
    openEditFromPicker,
    runSnapshotSaveForTabIds,
    runExecutionIntentForSnapshot
  } = p

  const closeActionMenu = useCallback(() => {
    dispatch({
      type: "update",
      updater: (prev) =>
        prev.actionMenuPanel === null ? prev : { ...prev, actionMenuPanel: null }
    })
  }, [dispatch])

  const openActionMenuFromPicker = useCallback(() => {
    const row = getPickerRowAtHi(rows, visibleRowIndices, hi)
    const targetKind = resolveActionMenuTargetKind(markedKind, row)
    if (!targetKind) {
      return
    }
    const tabTargets = resolveActionMenuTabTargets(
      rows,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      row
    )
    dispatch({
      type: "update",
      updater: (prev) => ({
        ...prev,
        actionMenuPanel: buildActionMenuPanel(targetKind, tabTargets)
      })
    })
  }, [
    dispatch,
    hi,
    markedGroupKeys,
    markedKind,
    markedTabIds,
    markedWindowIds,
    rows,
    visibleRowIndices
  ])

  const cycleActionMenuPick = useCallback(
    (delta: number) => {
      if (!actionMenuPanel) {
        return
      }
      const len = actionMenuItemsForKind(actionMenuPanel.targetKind).length
      const next = (((actionMenuPanel.pickIndex + delta) % len) + len) % len
      dispatch({
        type: "update",
        updater: (prev) =>
          prev.actionMenuPanel === null
            ? prev
            : { ...prev, actionMenuPanel: { ...prev.actionMenuPanel, pickIndex: next } }
      })
    },
    [actionMenuPanel, dispatch]
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

    const row = getPickerRowAtHi(rows, visibleRowIndices, hi)

    if (actionId === "edit") {
      const baseSlice = pickerSliceFromParams({
        hi,
        moveDestHi,
        markedKind,
        markedTabIds,
        markedWindowIds,
        markedGroupKeys,
        bulkSubMode
      })
      const markedSlice = applyImplicitMark(baseSlice, row, markedCount)
      dispatch({
        type: "update",
        updater: (prev) => ({
          ...prev,
          actionMenuPanel: null,
          hi: markedSlice.hi,
          moveDestHi: markedSlice.moveDestHi,
          markedKind: markedSlice.markedKind,
          markedTabIds: markedSlice.markedTabIds,
          markedWindowIds: markedSlice.markedWindowIds,
          markedGroupKeys: markedSlice.markedGroupKeys
        })
      })
      await openEditFromPicker({
        markedKind: markedSlice.markedKind,
        markedTabIds: markedSlice.markedTabIds,
        markedWindowIds: markedSlice.markedWindowIds,
        markedGroupKeys: markedSlice.markedGroupKeys,
        hi: markedSlice.hi
      })
      return
    }

    const baseSlice = pickerSliceFromParams({
      hi,
      moveDestHi,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      bulkSubMode
    })
    const markedSlice = applyImplicitMark(baseSlice, row, markedCount)

    const selectedTabIds = resolvePickerExecutionTabIds(
      rows,
      visibleRowIndices,
      markedSlice,
      resolveTargetWindowIdForWindowBulk(
        markedSlice.markedKind,
        markedSlice.markedWindowIds,
        rows,
        visibleRowIndices,
        markedSlice.hi
      ) ?? undefined
    )

    if (actionId === "newTab") {
      dispatch({
        type: "update",
        updater: (prev) => ({
          ...prev,
          actionMenuPanel: null,
          hi: markedSlice.hi,
          moveDestHi: markedSlice.moveDestHi,
          markedKind: markedSlice.markedKind,
          markedTabIds: markedSlice.markedTabIds,
          markedWindowIds: markedSlice.markedWindowIds,
          markedGroupKeys: markedSlice.markedGroupKeys,
          bulkSubMode: "newTab"
        })
      })
      const wid = resolveTargetWindowIdForWindowBulk(
        markedSlice.markedKind,
        markedSlice.markedWindowIds,
        rows,
        visibleRowIndices,
        hi
      )
      if (wid !== null) {
        setNewTabUrlWindowId(wid)
        setNewTabUrl("")
      }
      return
    }

    if (actionId === "snapshot") {
      dispatch({
        type: "update",
        updater: (prev) => ({
          ...prev,
          actionMenuPanel: null,
          hi: markedSlice.hi,
          moveDestHi: markedSlice.moveDestHi,
          markedKind: markedSlice.markedKind,
          markedTabIds: markedSlice.markedTabIds,
          markedWindowIds: markedSlice.markedWindowIds,
          markedGroupKeys: markedSlice.markedGroupKeys,
          bulkSubMode: null
        })
      })
      await runSnapshotSaveForTabIds(selectedTabIds)
      return
    }

    const nextBulkSubMode = actionId as BulkSubMode

    dispatch({
      type: "update",
      updater: (prev) => ({
        ...prev,
        actionMenuPanel: null,
        hi: markedSlice.hi,
        moveDestHi: markedSlice.moveDestHi,
        markedKind: markedSlice.markedKind,
        markedTabIds: markedSlice.markedTabIds,
        markedWindowIds: markedSlice.markedWindowIds,
        markedGroupKeys: markedSlice.markedGroupKeys,
        bulkSubMode: nextBulkSubMode
      })
    })

    if (IMMEDIATE_MENU_ACTIONS.has(actionId)) {
      const intent = intentForImmediateAction(actionId)
      if (intent !== null) {
        const execSlice: PickerReducerState = { ...markedSlice, bulkSubMode: nextBulkSubMode }
        await runExecutionIntentForSnapshot(intent, execSlice, selectedTabIds)
      }
    }
  }, [
    actionMenuPanel,
    bulkSubMode,
    dispatch,
    hi,
    markedCount,
    markedGroupKeys,
    markedKind,
    markedTabIds,
    markedWindowIds,
    moveDestHi,
    openEditFromPicker,
    runSnapshotSaveForTabIds,
    runExecutionIntentForSnapshot,
    setNewTabUrl,
    setNewTabUrlWindowId,
    visibleRowIndices
  ])

  return {
    openActionMenuFromPicker,
    closeActionMenu,
    cycleActionMenuPick,
    confirmActionMenuPick
  }
}
