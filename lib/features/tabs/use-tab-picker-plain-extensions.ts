import type { MutableRefObject, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useCallback, useMemo, useRef } from "react"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import { isPickerAltBlockedChord } from "../side-picker/preview/picker-alt-chord"
import { pickerAltVerticalNavDirection } from "../side-picker/preview/picker-alt-vertical-nav"
import {
  groupRowKey,
  isPhysicalArrowDown,
  isPhysicalArrowUp,
  isReservedSplitPaneVerticalNav,
  verticalNavDirection
} from "./tab-picker-keyboard"
import { tabPickerVisibleHiIndicesMatching, type TabPickerRow } from "./picker-rows"
import { useTabPickerLiveFieldsRevision } from "./use-tab-picker-live-fields-revision"
import type { ExecutionIntent } from "./controller/execute-actions"
import {
  resolvePickerEnterIntent,
  resolvePickerPreview,
  type PickerReducerEvent
} from "./state-machine"
import type { BulkSubMode, EditPanel, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import { resolveTargetWindowIdForWindowBulk } from "./tab-picker-bulk-window"
import type { TabPickerActionId, TabPickerListView } from "./tab-picker-actions"
import type { TabPickerActionRow } from "./use-tab-picker-action-view"

type ApplyReduced = (ev: PickerReducerEvent) => void
type ApplyReducedSeq = (events: PickerReducerEvent[]) => void

export function useTabPickerPlainExtensions({
  rows,
  visibleRowIndices,
  hi,
  moveDestHi,
  markedKind,
  markedTabIds,
  markedWindowIds,
  markedGroupKeys,
  bulkSubMode,
  variant,
  groupNewPhase,
  searchMode,
  filterQuery,
  groupChoices,
  groupPickIndex,
  selectedTabIds,
  markedCount,
  inputRef,
  groupMetaTitleRef,
  groupMetaColorStripRef,
  shiftRangeAnchorHiRef,
  applyReducedState,
  applyReducedStateSequence,
  setHi,
  setHlSearchPattern,
  setBulkSubMode,
  setGroupNewPhase,
  setNewGroupTitle,
  setNewGroupColorIndex,
  setGroupPickIndex,
  newGroupTabIdsRef,
  confirmSelection,
  runExecutionIntent,
  executeCreateNewGroup,
  executeOpenNewTabFromUrl,
  newTabUrl,
  newTabUrlWindowId,
  setNewTabUrlWindowId,
  setNewTabUrl,
    closeSearch,
    commitSearchFoldSession,
    onReturnToPrompt,
    hlSearchPattern,
  editPanel,
  openEditFromPicker,
  closeEdit,
  confirmWindowRename,
  confirmGroupRename,
  confirmGroupMenuPick,
  cycleGroupMenuPick,
  backFromGroupRename,
  altKeyHeldRef,
  onExitToDetailBar,
  pickerView,
  actionHi,
  setActionHi,
  actionRows,
  enterActionView,
  exitActionView,
  commitAction,
  canEnterActionView
}: {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bulkSubMode: BulkSubMode | null
  variant: "default" | "groupNew"
  groupNewPhase: "tabs" | "meta"
  searchMode: boolean
  filterQuery: string
  groupChoices: GroupChoice[]
  groupPickIndex: number
  selectedTabIds: number[]
  markedCount: number
  inputRef: RefObject<HTMLTextAreaElement | null>
  groupMetaTitleRef: RefObject<HTMLInputElement | null>
  groupMetaColorStripRef: RefObject<HTMLDivElement | null>
  shiftRangeAnchorHiRef: MutableRefObject<number | null>
  applyReducedState: ApplyReduced
  applyReducedStateSequence: ApplyReducedSeq
  setHi: Dispatch<SetStateAction<number>>
  setHlSearchPattern: Dispatch<SetStateAction<string>>
  setBulkSubMode: Dispatch<SetStateAction<BulkSubMode | null>>
  setGroupNewPhase: Dispatch<SetStateAction<"tabs" | "meta">>
  setNewGroupTitle: Dispatch<SetStateAction<string>>
  setNewGroupColorIndex: Dispatch<SetStateAction<number>>
  setGroupPickIndex: Dispatch<SetStateAction<number>>
  newGroupTabIdsRef: MutableRefObject<number[]>
  confirmSelection: () => Promise<void>
  runExecutionIntent: (intent: ExecutionIntent) => Promise<void>
  executeCreateNewGroup: () => Promise<void>
  executeOpenNewTabFromUrl: (windowId: number, urlRaw: string) => void | Promise<void>
  newTabUrl: string
  newTabUrlWindowId: number | null
  setNewTabUrlWindowId: Dispatch<SetStateAction<number | null>>
  setNewTabUrl: Dispatch<SetStateAction<string>>
  closeSearch: () => void
  commitSearchFoldSession: (query: string) => void
  onReturnToPrompt: () => void
  hlSearchPattern: string
  editPanel: EditPanel | null
  openEditFromPicker: () => void | Promise<void>
  closeEdit: () => void
  confirmWindowRename: () => void | Promise<void>
  confirmGroupRename: () => void | Promise<void>
  confirmGroupMenuPick: () => void | Promise<void>
  cycleGroupMenuPick: (delta: number) => void
  backFromGroupRename: () => void
  altKeyHeldRef: MutableRefObject<boolean>
  onExitToDetailBar?: () => void
  pickerView: TabPickerListView
  actionHi: number
  setActionHi: Dispatch<SetStateAction<number>>
  actionRows: TabPickerActionRow[]
  enterActionView: () => boolean
  exitActionView: () => void
  commitAction: (actionId: TabPickerActionId) => void | Promise<void>
  canEnterActionView: boolean
}): PlainPickerKeyboardExtensions {
  useTabPickerLiveFieldsRevision()

  const newTabUrlWindowIdRef = useRef(newTabUrlWindowId)
  const newTabUrlRef = useRef(newTabUrl)
  newTabUrlWindowIdRef.current = newTabUrlWindowId
  newTabUrlRef.current = newTabUrl

  const onCaptureBefore = useCallback(
    (e: KeyboardEvent): boolean => {
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return false
      }
      const isLeft = e.key === "ArrowLeft" || e.code === "ArrowLeft"
      const isRight = e.key === "ArrowRight" || e.code === "ArrowRight"
      if (!isLeft && !isRight) {
        return false
      }

      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return false
      }

      if (pickerView === "actions") {
        if (isLeft) {
          pickerStopEvent(e)
          exitActionView()
          return true
        }
        return false
      }

      if (
        searchMode ||
        bulkSubMode !== null ||
        groupNewPhase === "meta" ||
        newTabUrlWindowId !== null ||
        editPanel !== null
      ) {
        return false
      }
      if (visibleRowIndices.length === 0) {
        return false
      }
      const rowIndex = visibleRowIndices[hi]
      const row = rowIndex !== undefined ? rows[rowIndex] : undefined
      if (!row) {
        return false
      }

      if (isRight && canEnterActionView) {
        pickerStopEvent(e)
        enterActionView()
        return true
      }

      if (isLeft && onExitToDetailBar) {
        pickerStopEvent(e)
        onExitToDetailBar()
        return true
      }

      return false
    },
    [
      bulkSubMode,
      canEnterActionView,
      editPanel,
      enterActionView,
      exitActionView,
      groupNewPhase,
      hi,
      newTabUrlWindowId,
      onExitToDetailBar,
      pickerView,
      rows,
      searchMode,
      visibleRowIndices
    ]
  )

  const customVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (pickerView === "actions") {
        const navDir = verticalNavDirection(e)
        if (navDir === null || actionRows.length === 0) {
          return false
        }
        pickerStopEvent(e)
        setActionHi((current) =>
          navDir === "down"
            ? Math.min(current + 1, actionRows.length - 1)
            : Math.max(current - 1, 0)
        )
        return true
      }

      if (isPickerAltBlockedChord(e)) {
        return false
      }
      const navDir = pickerAltVerticalNavDirection(e, altKeyHeldRef)
      if (navDir === null) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return false
      }

      if (
        groupNewPhase === "meta" ||
        newTabUrlWindowId !== null ||
        editPanel?.kind === "windowRename" ||
        editPanel?.kind === "groupRename"
      ) {
        const ae = document.activeElement
        if (
          ae === groupMetaTitleRef.current ||
          groupMetaColorStripRef.current?.contains(ae ?? null)
        ) {
          return false
        }
      }

      if (editPanel?.kind === "groupMenu") {
        pickerStopEvent(e)
        cycleGroupMenuPick(navDir === "down" ? 1 : -1)
        return true
      }

      if (bulkSubMode === "move") {
        pickerStopEvent(e)
        if (visibleRowIndices.length === 0) {
          return true
        }
        if (navDir === "down") {
          applyReducedState({ kind: "moveDest", delta: 1, visibleLen: visibleRowIndices.length })
        } else {
          applyReducedState({ kind: "moveDest", delta: -1, visibleLen: visibleRowIndices.length })
        }
        return true
      }

      if (
        e.ctrlKey &&
        e.shiftKey &&
        visibleRowIndices.length > 0 &&
        (isPhysicalArrowDown(e) || isPhysicalArrowUp(e))
      ) {
        pickerStopEvent(e)
        const delta = isPhysicalArrowDown(e) ? 1 : -1
        const previewRows = visibleRowIndices.map((ri) => {
          const r = rows[ri]
          if (!r) {
            return { kind: "tab" as const }
          }
          if (r.kind === "tab") {
            return { kind: "tab" as const, tabId: r.tabId }
          }
          return { kind: r.kind as "window" | "group" }
        })
        const decision = resolvePickerPreview(hi, delta, previewRows)
        applyReducedState({
          kind: "moveHi",
          delta,
          visibleLen: visibleRowIndices.length
        })
        if (decision.activateTabId !== null) {
          void chrome.tabs.update(decision.activateTabId, { active: true }).catch(() => undefined)
        }
        return true
      }

      const shiftArrowBlocksBulk =
        bulkSubMode === "group" ||
        groupNewPhase === "meta" ||
        newTabUrlWindowId !== null ||
        editPanel !== null
      if (
        !shiftArrowBlocksBulk &&
        e.shiftKey &&
        (isPhysicalArrowDown(e) || isPhysicalArrowUp(e))
      ) {
        pickerStopEvent(e)
        if (visibleRowIndices.length === 0) {
          return true
        }
        const n = visibleRowIndices.length
        if (shiftRangeAnchorHiRef.current === null) {
          shiftRangeAnchorHiRef.current = hi
        }
        const anchor = shiftRangeAnchorHiRef.current
        const newHi = isPhysicalArrowDown(e)
          ? Math.min(n - 1, hi + 1)
          : Math.max(0, hi - 1)
        const lo = Math.min(anchor, newHi)
        const hiVis = Math.max(anchor, newHi)
        const rangeRows = visibleRowIndices.slice(lo, hiVis + 1).map((ri) => {
          const row = rows[ri]
          if (!row) {
            return { kind: "tab" as const }
          }
          if (row.kind === "tab") {
            return { kind: "tab" as const, tabId: row.tabId }
          }
          if (row.kind === "window") {
            return { kind: "window" as const, windowId: row.windowId }
          }
          return {
            kind: "group" as const,
            groupKey: groupRowKey(row.windowId, row.groupId)
          }
        })
        applyReducedStateSequence([
          {
            kind: "moveHi",
            delta: isPhysicalArrowDown(e) ? 1 : -1,
            visibleLen: n
          },
          {
            kind: "selectRange",
            input: {
              anchor: 0,
              target: rangeRows.length > 0 ? rangeRows.length - 1 : 0,
              rows: rangeRows
            }
          }
        ])
        return true
      }

      if (bulkSubMode === "group") {
        pickerStopEvent(e)
        if (groupChoices.length === 0) {
          return true
        }
        if (navDir === "down") {
          setGroupPickIndex((i) => (i + 1) % groupChoices.length)
        } else {
          setGroupPickIndex((i) => (i - 1 + groupChoices.length) % groupChoices.length)
        }
        return true
      }

      pickerStopEvent(e)
      if (visibleRowIndices.length === 0) {
        return true
      }
      shiftRangeAnchorHiRef.current = null
      applyReducedState({
        kind: "moveHi",
        delta: navDir === "down" ? 1 : -1,
        visibleLen: visibleRowIndices.length
      })
      return true
    },
    [
      actionRows.length,
      applyReducedState,
      applyReducedStateSequence,
      bulkSubMode,
      cycleGroupMenuPick,
      editPanel,
      groupChoices.length,
      groupMetaColorStripRef,
      groupMetaTitleRef,
      groupNewPhase,
      hi,
      newTabUrlWindowId,
      pickerView,
      rows,
      setActionHi,
      setGroupPickIndex,
      shiftRangeAnchorHiRef,
      visibleRowIndices,
      altKeyHeldRef
    ]
  )

  const onNormalEnter = useCallback(
    (e: KeyboardEvent): boolean => {
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }

      if (pickerView === "actions") {
        const action = actionRows[actionHi]
        if (!action) {
          return false
        }
        pickerStopEvent(e)
        void commitAction(action.id)
        return true
      }

      if (newTabUrlWindowIdRef.current !== null) {
        pickerStopEvent(e)
        const wid = newTabUrlWindowIdRef.current
        const raw = groupMetaTitleRef.current?.value ?? newTabUrlRef.current
        void executeOpenNewTabFromUrl(wid, raw)
        return true
      }

      if (editPanel?.kind === "windowRename") {
        pickerStopEvent(e)
        void confirmWindowRename()
        return true
      }
      if (editPanel?.kind === "groupRename") {
        pickerStopEvent(e)
        void confirmGroupRename()
        return true
      }
      if (editPanel?.kind === "groupMenu") {
        pickerStopEvent(e)
        void confirmGroupMenuPick()
        return true
      }

      if (groupNewPhase === "meta") {
        pickerStopEvent(e)
        void executeCreateNewGroup()
        return true
      }

      const intent = resolvePickerEnterIntent(
        {
          hi,
          moveDestHi,
          markedKind,
          markedTabIds,
          markedWindowIds,
          markedGroupKeys,
          bulkSubMode
        },
        variant,
        groupNewPhase,
        selectedTabIds.length,
        false
      )
      if (intent === "none") {
        return false
      }

      pickerStopEvent(e)

      if (intent === "openGroupMeta") {
        newGroupTabIdsRef.current = [...selectedTabIds]
        setGroupNewPhase("meta")
        setNewGroupTitle("")
        setNewGroupColorIndex(0)
        return true
      }
      if (intent === "openNewTabUrlMeta") {
        const wid = resolveTargetWindowIdForWindowBulk(
          markedKind,
          markedWindowIds,
          rows,
          visibleRowIndices,
          hi
        )
        if (wid === null) {
          return false
        }
        setNewTabUrlWindowId(wid)
        setNewTabUrl("")
        return true
      }
      if (
        intent === "executeClose" ||
        intent === "executeMove" ||
        intent === "executeGroup" ||
        intent === "executeNewWindow"
      ) {
        void runExecutionIntent(intent)
        return true
      }
      if (intent === "confirmSelection") {
        void confirmSelection()
        return true
      }
      return false
    },
    [
      actionHi,
      actionRows,
      bulkSubMode,
      commitAction,
      confirmSelection,
      confirmGroupMenuPick,
      confirmGroupRename,
      confirmWindowRename,
      editPanel,
      executeCreateNewGroup,
      executeOpenNewTabFromUrl,
      groupMetaTitleRef,
      groupNewPhase,
      hi,
      markedGroupKeys,
      markedKind,
      markedTabIds,
      markedWindowIds,
      moveDestHi,
      newGroupTabIdsRef,
      pickerView,
      runExecutionIntent,
      rows,
      selectedTabIds,
      setNewTabUrl,
      setNewTabUrlWindowId,
      setGroupNewPhase,
      setNewGroupColorIndex,
      setNewGroupTitle,
      variant,
      visibleRowIndices
    ]
  )

  const onEsc = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "Escape") {
        return false
      }
      const stop = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (newTabUrlWindowId !== null) {
        stop()
        setNewTabUrlWindowId(null)
        setNewTabUrl("")
        requestAnimationFrame(() => inputRef.current?.focus())
        return true
      }
      if (editPanel?.kind === "groupRename") {
        stop()
        backFromGroupRename()
        requestAnimationFrame(() => inputRef.current?.focus())
        return true
      }
      if (editPanel !== null) {
        stop()
        closeEdit()
        requestAnimationFrame(() => inputRef.current?.focus())
        return true
      }
      if (groupNewPhase === "meta") {
        stop()
        setGroupNewPhase("tabs")
        requestAnimationFrame(() => inputRef.current?.focus())
        return true
      }
      if (pickerView === "actions") {
        stop()
        exitActionView()
        return true
      }
      if (markedCount > 0) {
        stop()
        applyReducedState({ kind: "clearMarked" })
        shiftRangeAnchorHiRef.current = null
        return true
      }
      if (searchMode) {
        stop()
        closeSearch()
        return true
      }
      if (bulkSubMode !== null) {
        stop()
        setBulkSubMode(null)
        return true
      }
      return false
    },
    [
      applyReducedState,
      backFromGroupRename,
      bulkSubMode,
      closeEdit,
      closeSearch,
      editPanel,
      exitActionView,
      groupNewPhase,
      inputRef,
      markedCount,
      newTabUrlWindowId,
      pickerView,
      searchMode,
      setBulkSubMode,
      setGroupNewPhase,
      setNewTabUrl,
      setNewTabUrlWindowId,
      shiftRangeAnchorHiRef
    ]
  )

  const onInputAfterPlain = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (groupNewPhase === "meta" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeCreateNewGroup()
        return true
      }

      if (e.key === "Tab") {
        if (
          pickerView === "actions" ||
          groupNewPhase === "meta" ||
          newTabUrlWindowId !== null ||
          editPanel !== null
        ) {
          e.preventDefault()
          return true
        }
        if (visibleRowIndices.length === 0) {
          e.preventDefault()
          e.stopPropagation()
          return true
        }
        const rowIndex = visibleRowIndices[hi]
        const row = rowIndex !== undefined ? rows[rowIndex] : undefined
        if (!row) {
          e.preventDefault()
          e.stopPropagation()
          return true
        }
        e.preventDefault()
        e.stopPropagation()
        shiftRangeAnchorHiRef.current = null
        applyReducedState({
          kind: "toggleCurrent",
          row:
            row.kind === "tab"
              ? { kind: "tab", tabId: row.tabId }
              : row.kind === "window"
                ? { kind: "window", windowId: row.windowId }
                : { kind: "group", groupKey: groupRowKey(row.windowId, row.groupId) }
        })
        return true
      }

      if (e.key === " " && variant === "groupNew" && markedTabIds.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (
        e.key === " " &&
        (groupNewPhase === "meta" || newTabUrlWindowId !== null || editPanel !== null)
      ) {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      return false
    },
    [
      applyReducedState,
      editPanel,
      executeCreateNewGroup,
      groupNewPhase,
      hi,
      markedTabIds,
      newTabUrlWindowId,
      pickerView,
      rows,
      shiftRangeAnchorHiRef,
      variant,
      visibleRowIndices
    ]
  )

  return useMemo(
    (): PlainPickerKeyboardExtensions => ({
      onCaptureBefore,
      customVerticalNav,
      isSearchJumpEnabled: () =>
        pickerView === "list" &&
        !searchMode &&
        groupNewPhase !== "meta" &&
        newTabUrlWindowId === null &&
        editPanel === null &&
        bulkSubMode !== "move" &&
        bulkSubMode !== "group" &&
        hlSearchPattern !== "",
      matchIndices: () =>
        tabPickerVisibleHiIndicesMatching(rows, visibleRowIndices, hlSearchPattern),
      onNormalEnter,
      onEsc,
      onInputAfterPlain,
      blockOpenChords: () =>
        pickerView === "actions" ||
        groupNewPhase === "meta" ||
        newTabUrlWindowId !== null ||
        editPanel !== null,
      blockPlainTyping: () =>
        pickerView === "actions" ||
        groupNewPhase === "meta" ||
        newTabUrlWindowId !== null ||
        editPanel !== null
    }),
    [
      bulkSubMode,
      customVerticalNav,
      editPanel,
      groupNewPhase,
      hlSearchPattern,
      newTabUrlWindowId,
      onCaptureBefore,
      onEsc,
      onInputAfterPlain,
      onNormalEnter,
      pickerView,
      rows,
      searchMode,
      visibleRowIndices
    ]
  )
}
