import { useCallback } from "react"
import { GROUP_EDIT_MENU_ITEMS } from "./tab-picker-overlay-constants"
import { groupEditMenuActionAtPickIndex } from "./group-edit-menu"
import { tTabs } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
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
import { pickerMarkedCount } from "./use-tab-picker-derived-state"
import {
  buildCloseGroupCommandLine,
  buildGroupRenameCommandLine,
  buildGroupUngroupCommandLine,
  buildWindowRenameCommandLine
} from "../picker/build-picker-command-line.ts"

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
  /** EN: Typed command re-entry for rename / ungroup / delete. */
  submitConstructedLine: (line: string) => void
}

export type EditPickerSnapshot = {
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  hi: number
}

export function useTabPickerEdit(p: TabPickerEditParams) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
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
    onAppendLog
  } = p
  const submitLine = p.submitConstructedLine

  const closeEdit = useCallback(() => {
    setEditPanel(null)
    setEditTitle("")
    setBulkSubMode(null)
  }, [setBulkSubMode, setEditPanel, setEditTitle])

  const openEditFromPicker = useCallback(
    async (snapshot?: EditPickerSnapshot) => {
      const useMarkedKind = snapshot?.markedKind ?? markedKind
      const useMarkedTabIds = snapshot?.markedTabIds ?? []
      const useMarkedWindowIds = snapshot?.markedWindowIds ?? markedWindowIds
      const useMarkedGroupKeys = snapshot?.markedGroupKeys ?? markedGroupKeys
      const useHi = snapshot?.hi ?? hi
      const useMarkedCount = snapshot
        ? pickerMarkedCount(
            useMarkedKind,
            useMarkedTabIds,
            useMarkedWindowIds,
            useMarkedGroupKeys
          )
        : markedCount

      const target = resolveEditTarget(
        useMarkedKind,
        useMarkedWindowIds,
        useMarkedGroupKeys,
        rows,
        visibleRowIndices,
        useHi
      )
      if (!target) {
        const err = editTargetErrorMessage(
          useMarkedKind,
          useMarkedWindowIds,
          useMarkedGroupKeys,
          rows,
          visibleRowIndices,
          useHi,
          locale
        )
        void onAppendLog?.([
          err ?? tTabs("tabs.picker.error.editNeedsWindowOrGroup", locale)
        ])
        return
      }

      const rowIndex = visibleRowIndices[useHi]
      const row = rowIndex !== undefined ? rows[rowIndex] : undefined
      if (useMarkedCount === 0 && row) {
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
    },
    [
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
      visibleRowIndices,
      locale
    ]
  )

  const confirmWindowRename = useCallback(async () => {
    if (editPanel?.kind !== "windowRename") {
      return
    }
    const line = buildWindowRenameCommandLine(editPanel.windowId, editTitle)
    if (line === null) {
      void onAppendLog?.([tTabs("tabs.picker.error.windowNameSaveFailed", locale)])
      return
    }
    clearMarkedViaReducer()
    closeEdit()
    submitLine(line)
  }, [
    clearMarkedViaReducer,
    closeEdit,
    editPanel,
    editTitle,
    locale,
    onAppendLog,
    submitLine
  ])

  const confirmGroupRename = useCallback(async () => {
    if (editPanel?.kind !== "groupRename") {
      return
    }
    const line = buildGroupRenameCommandLine(editPanel.groupId, editTitle)
    if (line === null) {
      void onAppendLog?.([tTabs("tabs.picker.error.groupNameSaveFailed", locale)])
      return
    }
    clearMarkedViaReducer()
    closeEdit()
    submitLine(line)
  }, [
    clearMarkedViaReducer,
    closeEdit,
    editPanel,
    editTitle,
    locale,
    onAppendLog,
    submitLine
  ])

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
      const line =
        actionId === "ungroup"
          ? buildGroupUngroupCommandLine(editPanel.groupId)
          : actionId === "deleteGroup"
            ? buildCloseGroupCommandLine(editPanel.groupId)
            : null
      if (line === null) {
        void onAppendLog?.([tTabs("tabs.picker.error.groupActionFailed", locale)])
        return
      }
      clearMarkedViaReducer()
      closeEdit()
      submitLine(line)
    },
    [
      clearMarkedViaReducer,
      closeEdit,
      editPanel,
      locale,
      onAppendLog,
      setEditPanel,
      setEditTitle,
      submitLine
    ]
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
