import type { MutableRefObject, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useCallback, useMemo, useRef } from "react"
import {
  cyclePickerCommandCompletion,
  type PickerCommandCompletionState
} from "../side-picker/interaction/picker-command-completion"
import {
  runPickerCommandEnter as runPickerCommandEnterKernel,
  type RunPickerCommandEnterOptions
} from "../side-picker/interaction/picker-command-enter"
import {
  pickerOpenCommandChord,
  pickerOpenSearchChord,
  pickerPlainTypingKey,
  pickerStopEvent
} from "../side-picker/interaction/picker-key-event"
import { runPickerWindowCaptureChain } from "../side-picker/interaction/picker-list-kernel"
import { runPickerSearchEnter } from "../side-picker/interaction/picker-search-enter"
import { runPickerSearchJump } from "../side-picker/interaction/picker-search-jump"
import {
  groupRowKey,
  isPhysicalArrowDown,
  isPhysicalArrowUp,
  isReservedSplitPaneVerticalNav,
  verticalNavDirection
} from "./tab-picker-keyboard"
import { logBmxtKey } from "../debug/key-log"
import { tabPickerVisibleHiIndicesMatching, type TabPickerRow } from "./picker-rows"
import type { ExecutionIntent } from "./controller/execute-actions"
import {
  resolvePickerEnterIntent,
  resolvePickerPreview,
  type PickerReducerEvent
} from "./state-machine"
import {
  NEW_GROUP_COLORS,
  filterTabPickerCommandCompletions
} from "./tab-picker-overlay-constants"
import type {
  BulkSubMode,
  EditPanel,
  GroupChoice,
  SelectKind
} from "./tab-picker-overlay-types"
import { resolveTargetWindowIdForWindowBulk } from "./tab-picker-bulk-window"

type ApplyReduced = (ev: PickerReducerEvent) => void
type ApplyReducedSeq = (events: PickerReducerEvent[]) => void

function parsePickerCommand(cmd: string): BulkSubMode | null {
  switch (cmd.trim().toLowerCase()) {
    case "move":
    case "m":
      return "move"
    case "close":
    case "c":
      return "close"
    case "group":
    case "g":
      return "group"
    case "newwindow":
    case "nw":
    case "new-window":
      return "newWindow"
    case "newtab":
    case "nt":
    case "new-tab":
      return "newTab"
    case "edit":
      return "edit"
    default:
      return null
  }
}

export function useTabPickerKeyboard({
  rows,
  visibleRowIndices,
  hi,
  moveDestHi,
  markedKind,
  markedTabIds,
  markedWindowIds,
  markedGroupKeys,
  bulkSubMode,
  markedTabSet,
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
  setSearchMode,
  setFilterQuery,
  hlSearchPattern,
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
  onReturnToPrompt,
  commandMode,
  commandBuffer,
  setCommandMode,
  setCommandBuffer,
  setCommandListingHint,
  isHostPaneFocused,
  sessionId,
  editPanel,
  editPanelRef,
  openEditFromPicker,
  closeEdit,
  confirmWindowRename,
  confirmGroupRename,
  confirmGroupMenuPick,
  cycleGroupMenuPick,
  backFromGroupRename
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
  markedTabSet: Set<number>
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
  setSearchMode: Dispatch<SetStateAction<boolean>>
  setFilterQuery: Dispatch<SetStateAction<string>>
  hlSearchPattern: string
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
  onReturnToPrompt: () => void
  commandMode: boolean
  commandBuffer: string
  setCommandMode: Dispatch<SetStateAction<boolean>>
  setCommandBuffer: Dispatch<SetStateAction<string>>
  setCommandListingHint: Dispatch<SetStateAction<boolean>>
  isHostPaneFocused: boolean
  sessionId: string
  editPanel: EditPanel | null
  editPanelRef: RefObject<HTMLDivElement | null>
  openEditFromPicker: () => void | Promise<void>
  closeEdit: () => void
  confirmWindowRename: () => void | Promise<void>
  confirmGroupRename: () => void | Promise<void>
  confirmGroupMenuPick: () => void | Promise<void>
  cycleGroupMenuPick: (delta: number) => void
  backFromGroupRename: () => void
}) {
  const newTabUrlWindowIdRef = useRef(newTabUrlWindowId)
  const newTabUrlRef = useRef(newTabUrl)
  newTabUrlWindowIdRef.current = newTabUrlWindowId
  newTabUrlRef.current = newTabUrl

  const commandCompletionRef = useRef<PickerCommandCompletionState | null>(null)

  const clearCommandMode = useCallback(() => {
    commandCompletionRef.current = null
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
  }, [setCommandBuffer, setCommandListingHint, setCommandMode])

  const commitTabPickerCommand = useCallback(
    (buffer: string) => {
      const mode = parsePickerCommand(buffer)
      clearCommandMode()
      if (mode === "edit") {
        void openEditFromPicker()
        return
      }
      if (mode !== null) {
        const rowIndex = visibleRowIndices[hi]
        const row = rowIndex !== undefined ? rows[rowIndex] : undefined
        if (row && markedCount === 0) {
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
        }
        setBulkSubMode(mode)
      }
    },
    [
      applyReducedState,
      clearCommandMode,
      hi,
      markedCount,
      openEditFromPicker,
      rows,
      setBulkSubMode,
      visibleRowIndices
    ]
  )

  const tabPickerCommandEnterOptions = useMemo(
    (): RunPickerCommandEnterOptions => ({
      commandMode,
      commandBuffer,
      onEmptyEnter: () => setCommandListingHint(true),
      onNohlsearch: () => {
        clearCommandMode()
        setHlSearchPattern("")
      },
      onCommand: (buffer) => {
        commitTabPickerCommand(buffer)
        return true
      }
    }),
    [clearCommandMode, commandBuffer, commandMode, commitTabPickerCommand, setCommandListingHint, setHlSearchPattern]
  )

  const runPickerCommandEnter = useCallback(
    (e: KeyboardEvent) => runPickerCommandEnterKernel(e, tabPickerCommandEnterOptions),
    [tabPickerCommandEnterOptions]
  )

  const runPickerTabEnterKey = useCallback(
    (e: KeyboardEvent): boolean => {
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
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
        return false
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
        logBmxtKey("picker", "Enter → intent none (Shift+Enter 等)", {})
        return false
      }

      logBmxtKey("picker", "Enter", { intent })
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
      bulkSubMode,
      confirmSelection,
      confirmGroupMenuPick,
      confirmGroupRename,
      confirmWindowRename,
      editPanel,
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

  const onMetaTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }
      if (newTabUrlWindowIdRef.current !== null) {
        if (e.key === "Escape") {
          e.preventDefault()
          setNewTabUrlWindowId(null)
          setNewTabUrl("")
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const wid = newTabUrlWindowIdRef.current
          if (wid !== null) {
            void executeOpenNewTabFromUrl(wid, e.currentTarget.value)
          }
          return
        }
        return
      }
      if (editPanel?.kind === "windowRename") {
        if (e.key === "Escape") {
          e.preventDefault()
          closeEdit()
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          void confirmWindowRename()
          return
        }
        return
      }
      if (editPanel?.kind === "groupRename") {
        if (e.key === "Escape") {
          e.preventDefault()
          backFromGroupRename()
          requestAnimationFrame(() => groupMetaTitleRef.current?.focus())
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          void confirmGroupRename()
          return
        }
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setGroupNewPhase("tabs")
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        requestAnimationFrame(() => groupMetaColorStripRef.current?.focus())
      }
    },
    [
      backFromGroupRename,
      closeEdit,
      confirmGroupRename,
      confirmWindowRename,
      editPanel,
      executeCreateNewGroup,
      executeOpenNewTabFromUrl,
      groupMetaColorStripRef,
      groupMetaTitleRef,
      inputRef,
      setGroupNewPhase,
      setNewTabUrl,
      setNewTabUrlWindowId
    ]
  )

  const onMetaColorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setGroupNewPhase("tabs")
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setNewGroupColorIndex(
          (i) => (i - 1 + NEW_GROUP_COLORS.length) % NEW_GROUP_COLORS.length
        )
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        setNewGroupColorIndex((i) => (i + 1) % NEW_GROUP_COLORS.length)
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        requestAnimationFrame(() => groupMetaTitleRef.current?.focus())
      }
    },
    [
      executeCreateNewGroup,
      groupMetaTitleRef,
      inputRef,
      setGroupNewPhase,
      setNewGroupColorIndex
    ]
  )

  const searchJumpEnabled =
    !searchMode &&
    !commandMode &&
    groupNewPhase !== "meta" &&
    newTabUrlWindowId === null &&
    editPanel === null &&
    bulkSubMode !== "move" &&
    bulkSubMode !== "group" &&
    hlSearchPattern !== ""

  const searchJumpOptions = useMemo(
    () => ({
      enabled: searchJumpEnabled,
      hi,
      highlightPattern: hlSearchPattern,
      matchIndices: () =>
        tabPickerVisibleHiIndicesMatching(rows, visibleRowIndices, hlSearchPattern),
      onJump: (target: number) => {
        shiftRangeAnchorHiRef.current = null
        setHi(target)
      }
    }),
    [
      hi,
      hlSearchPattern,
      rows,
      searchJumpEnabled,
      setHi,
      shiftRangeAnchorHiRef,
      visibleRowIndices
    ]
  )

  const runPickerSearchJumpHandler = useCallback(
    (e: KeyboardEvent) => runPickerSearchJump(e, searchJumpOptions),
    [searchJumpOptions]
  )

  const searchEnterOptions = useMemo(
    () => ({
      searchMode,
      filterQuery,
      onCommit: (pattern: string) => {
        setHlSearchPattern(pattern)
        setSearchMode(false)
        setFilterQuery("")
      }
    }),
    [filterQuery, searchMode, setFilterQuery, setHlSearchPattern, setSearchMode]
  )

  const runPickerVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.altKey) {
        return false
      }
      if (isReservedSplitPaneVerticalNav(e)) {
        return false
      }
      const navDir = verticalNavDirection(e)
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
      rows,
      setGroupPickIndex,
      shiftRangeAnchorHiRef,
      visibleRowIndices
    ]
  )

  const onWindowKeydownCapture = useCallback(
    (ev: KeyboardEvent) => {
      if (!isHostPaneFocused) {
        return
      }
      const handled = runPickerWindowCaptureChain(ev, sessionId, {
        verticalNav: runPickerVerticalNav,
        searchJump: searchJumpOptions,
        searchEnter: searchEnterOptions,
        commandEnter: tabPickerCommandEnterOptions,
        customEnter: runPickerTabEnterKey
      })
      if (handled) {
        const handler =
          ev.key === "n" || ev.key === "N"
            ? "searchJump"
            : ev.key === "j" || ev.key === "k" || ev.key.startsWith("Arrow")
              ? "verticalNav"
              : "capture"
        logBmxtKey("picker", "handled", { handler, key: ev.key, code: ev.code })
      }
    },
    [
      isHostPaneFocused,
      runPickerTabEnterKey,
      runPickerVerticalNav,
      searchEnterOptions,
      searchJumpOptions,
      sessionId,
      tabPickerCommandEnterOptions
    ]
  )

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }

      if (!isHostPaneFocused) {
        return
      }

      if (runPickerVerticalNav(e.nativeEvent)) {
        return
      }

      if (runPickerSearchJumpHandler(e.nativeEvent)) {
        return
      }

      if (runPickerSearchEnter(e.nativeEvent, searchEnterOptions)) {
        return
      }

      if (groupNewPhase === "meta" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }

      if (e.key === "Escape") {
        e.preventDefault()
        if (newTabUrlWindowId !== null) {
          setNewTabUrlWindowId(null)
          setNewTabUrl("")
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (editPanel?.kind === "groupRename") {
          backFromGroupRename()
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (editPanel !== null) {
          closeEdit()
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (commandMode) {
          clearCommandMode()
          return
        }
        if (groupNewPhase === "meta") {
          setGroupNewPhase("tabs")
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (markedCount > 0) {
          applyReducedState({ kind: "clearMarked" })
          shiftRangeAnchorHiRef.current = null
          return
        }
        if (searchMode) {
          closeSearch()
          return
        }
        if (bulkSubMode !== null) {
          setBulkSubMode(null)
          return
        }
        onReturnToPrompt()
        return
      }

      if (commandMode && e.key !== "Tab") {
        commandCompletionRef.current = null
      }

      if (e.key === "Tab") {
        if (commandMode) {
          e.preventDefault()
          e.stopPropagation()
          if (commandBuffer.trim() === "") {
            setCommandListingHint(true)
          }
          const cycled = cyclePickerCommandCompletion(
            commandCompletionRef.current,
            commandBuffer,
            filterTabPickerCommandCompletions(commandBuffer)
          )
          if (cycled === null) {
            return
          }
          commandCompletionRef.current = cycled.state
          setCommandBuffer(cycled.value)
          return
        }
        if (
          groupNewPhase === "meta" ||
          newTabUrlWindowId !== null ||
          editPanel !== null
        ) {
          e.preventDefault()
          return
        }
        if (visibleRowIndices.length === 0) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const rowIndex = visibleRowIndices[hi]
        const row = rowIndex !== undefined ? rows[rowIndex] : undefined
        if (!row) {
          e.preventDefault()
          e.stopPropagation()
          return
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
        return
      }

      if (e.key === " " && variant === "groupNew" && markedTabIds.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (
        e.key === " " &&
        (groupNewPhase === "meta" || newTabUrlWindowId !== null || editPanel !== null)
      ) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (e.key === "Enter") {
        if (commandMode) {
          if (runPickerCommandEnter(e.nativeEvent)) {
            return
          }
        }
        if (runPickerTabEnterKey(e.nativeEvent)) {
          return
        }
      }

      if (
        pickerOpenCommandChord(e.nativeEvent) &&
        !searchMode &&
        !commandMode &&
        groupNewPhase !== "meta" &&
        newTabUrlWindowId === null &&
        editPanel === null
      ) {
        e.preventDefault()
        setCommandMode(true)
        setCommandBuffer("")
        setCommandListingHint(false)
        return
      }

      if (pickerOpenSearchChord(e.nativeEvent)) {
        e.preventDefault()
        if (!searchMode) {
          setSearchMode(true)
        }
        return
      }

      if (!searchMode && !commandMode && pickerPlainTypingKey(e.nativeEvent)) {
        e.preventDefault()
      }
    },
    [
      applyReducedState,
      backFromGroupRename,
      bulkSubMode,
      clearCommandMode,
      closeEdit,
      closeSearch,
      commandBuffer,
      commandMode,
      editPanel,
      executeCreateNewGroup,
      groupNewPhase,
      searchEnterOptions,
      hi,
      isHostPaneFocused,
      markedCount,
      markedTabIds,
      newTabUrlWindowId,
      onReturnToPrompt,
      runPickerCommandEnter,
      runPickerSearchJumpHandler,
      runPickerTabEnterKey,
      runPickerVerticalNav,
      rows,
      searchMode,
      setBulkSubMode,
      setCommandBuffer,
      setCommandListingHint,
      setCommandMode,
      setGroupNewPhase,
      setFilterQuery,
      setHlSearchPattern,
      setNewTabUrl,
      setNewTabUrlWindowId,
      setSearchMode,
      shiftRangeAnchorHiRef,
      variant,
      visibleRowIndices,
      inputRef
    ]
  )

  return {
    onMetaTitleKeyDown,
    onMetaColorKeyDown,
    onWindowKeydownCapture,
    onInputKeyDown
  }
}
