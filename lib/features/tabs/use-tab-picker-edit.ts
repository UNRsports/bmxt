import { useCallback } from "react"
import {
  applyTabGroupTitle,
  applyWindowDisplayName,
  removeTabGroup,
  ungroupTabGroup
} from "./controller/edit-actions"
import { GROUP_EDIT_MENU_ITEMS } from "./tab-picker-overlay-constants"
import { groupEditMenuActionAtPickIndex } from "./group-edit-menu"
import type { EditPanel } from "./tab-picker-overlay-types"
import {
  buildInitialEditPanel,
  editTargetErrorMessage,
  loadEditTitleForPanel,
  resolveEditTarget
} from "./resolve-edit-entry"
import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import type { SelectKind } from "./tab-picker-overlay-types"
import type { PickerReducerEvent } from "./state-machine"

export type TabPickerEditParams = {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  markedKind: SelectKind | null
  markedWindowIds: number[]
  markedGroupKeys: string[]
  markedCount: number
  editPanel: EditPanel | null
  editTitle: string
  setEditPanel: (v: EditPanel | null) => void
  setEditTitle: (v: string) => void
  setBulkSubMode: (v: import("./tab-picker-overlay-types").BulkSubMode | null) => void
  applyReducedState: (ev: PickerReducerEvent) => void
  clearMarkedViaReducer: () => void
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
}

export function useTabPickerEdit(p: TabPickerEditParams) {
  const {
    rows,
    visibleRowIndices,
    hi,
    markedKind,
    markedWindowIds,
    markedGroupKeys,
    markedCount,
    editPanel,
    editTitle,
    setEditPanel,
    setEditTitle,
    setBulkSubMode,
    applyReducedState,
    clearMarkedViaReducer,
    onAppendLog,
    onRefreshRows
  } = p

  const closeEdit = useCallback(() => {
    setEditPanel(null)
    setEditTitle("")
    setBulkSubMode(null)
  }, [setBulkSubMode, setEditPanel, setEditTitle])

  const finishEdit = useCallback(async () => {
    clearMarkedViaReducer()
    closeEdit()
    await onRefreshRows?.()
  }, [clearMarkedViaReducer, closeEdit, onRefreshRows])

  const openEditFromPicker = useCallback(async () => {
    const target = resolveEditTarget(
      markedKind,
      markedWindowIds,
      markedGroupKeys,
      rows,
      visibleRowIndices,
      hi
    )
    if (!target) {
      const err = editTargetErrorMessage(
        markedKind,
        markedWindowIds,
        markedGroupKeys,
        rows,
        visibleRowIndices,
        hi
      )
      void onAppendLog?.([
        err ??
          "error: :edit はウィンドウ行またはタブグループ行を 1 つだけ選択したときに使えます。"
      ])
      return
    }

    const rowIndex = visibleRowIndices[hi]
    const row = rowIndex !== undefined ? rows[rowIndex] : undefined
    if (markedCount === 0 && row) {
      if (row.kind === "window") {
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
    }

    const panel = await buildInitialEditPanel(target)
    const title = await loadEditTitleForPanel(
      panel.kind === "windowRename"
        ? panel
        : panel.kind === "groupMenu"
          ? {
              kind: "groupRename",
              windowId: panel.windowId,
              groupId: panel.groupId,
              groupKey: panel.groupKey
            }
          : panel
    )
    setEditTitle(title)
    setEditPanel(panel)
    setBulkSubMode("edit")
  }, [
    applyReducedState,
    hi,
    markedCount,
    markedGroupKeys,
    markedKind,
    markedWindowIds,
    onAppendLog,
    rows,
    setBulkSubMode,
    setEditPanel,
    setEditTitle,
    visibleRowIndices
  ])

  const confirmWindowRename = useCallback(async () => {
    if (editPanel?.kind !== "windowRename") {
      return
    }
    try {
      await applyWindowDisplayName(editPanel.windowId, editTitle)
    } catch {
      void onAppendLog?.(["error: ウィンドウ名の保存に失敗しました。"])
      return
    }
    await finishEdit()
  }, [editPanel, editTitle, finishEdit, onAppendLog])

  const confirmGroupRename = useCallback(async () => {
    if (editPanel?.kind !== "groupRename") {
      return
    }
    try {
      await applyTabGroupTitle(editPanel.groupId, editTitle)
    } catch {
      void onAppendLog?.(["error: グループ名の変更に失敗しました。"])
      return
    }
    await finishEdit()
  }, [editPanel, editTitle, finishEdit, onAppendLog])

  const runGroupMenuAction = useCallback(
    async (actionId: ReturnType<typeof groupEditMenuActionAtPickIndex>) => {
      if (editPanel?.kind !== "groupMenu" || actionId === null) {
        return
      }
      if (actionId === "rename") {
        const title = await loadEditTitleForPanel({
          kind: "groupRename",
          windowId: editPanel.windowId,
          groupId: editPanel.groupId,
          groupKey: editPanel.groupKey
        })
        setEditTitle(title)
        setEditPanel({
          kind: "groupRename",
          windowId: editPanel.windowId,
          groupId: editPanel.groupId,
          groupKey: editPanel.groupKey
        })
        return
      }
      try {
        if (actionId === "ungroup") {
          await ungroupTabGroup(editPanel.groupId)
        } else if (actionId === "deleteGroup") {
          await removeTabGroup(editPanel.groupId)
        }
      } catch {
        void onAppendLog?.(["error: タブグループの操作に失敗しました。"])
        return
      }
      await finishEdit()
    },
    [editPanel, finishEdit, onAppendLog, setEditPanel, setEditTitle]
  )

  const confirmGroupMenuPick = useCallback(async () => {
    if (editPanel?.kind !== "groupMenu") {
      return
    }
    const actionId = groupEditMenuActionAtPickIndex(editPanel.pickIndex)
    await runGroupMenuAction(actionId)
  }, [editPanel, runGroupMenuAction])

  const cycleGroupMenuPick = useCallback(
    (delta: number) => {
      if (editPanel?.kind !== "groupMenu") {
        return
      }
      const len = GROUP_EDIT_MENU_ITEMS.length
      const next = (((editPanel.pickIndex + delta) % len) + len) % len
      setEditPanel({ ...editPanel, pickIndex: next })
    },
    [editPanel, setEditPanel]
  )

  const backFromGroupRename = useCallback(() => {
    if (editPanel?.kind !== "groupRename") {
      return
    }
    setEditPanel({
      kind: "groupMenu",
      windowId: editPanel.windowId,
      groupId: editPanel.groupId,
      groupKey: editPanel.groupKey,
      pickIndex: 0
    })
    setEditTitle("")
  }, [editPanel, setEditPanel, setEditTitle])

  return {
    openEditFromPicker,
    closeEdit,
    confirmWindowRename,
    confirmGroupRename,
    confirmGroupMenuPick,
    cycleGroupMenuPick,
    backFromGroupRename
  }
}
