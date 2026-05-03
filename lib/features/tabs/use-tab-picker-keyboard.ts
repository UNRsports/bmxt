import type { MutableRefObject, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useCallback, useRef } from "react"
import { logBmxtKey } from "../debug/key-log"
import type { TabPickerRow } from "./picker-rows"
import type { ExecutionIntent } from "./controller/execute-actions"
import {
  resolvePickerEnterIntent,
  resolvePickerPreview,
  type PickerReducerEvent
} from "./state-machine"
import { NEW_GROUP_COLORS } from "./tab-picker-overlay-constants"
import type { BulkSubMode, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import { resolveTargetWindowIdForWindowBulk } from "./tab-picker-bulk-window"
import {
  groupRowKey,
  isPhysicalArrowDown,
  isPhysicalArrowUp,
  verticalNavDirection
} from "./tab-picker-keyboard"

type ApplyReduced = (ev: PickerReducerEvent) => void
type ApplyReducedSeq = (events: PickerReducerEvent[]) => void

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
  setSearchMode,
  setFilterQuery,
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
  onExit
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
  setSearchMode: Dispatch<SetStateAction<boolean>>
  setFilterQuery: Dispatch<SetStateAction<string>>
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
  onExit: () => void
}) {
  /** window capture のリスナーが useEffect 更新より古いクロージャのときでも Enter で確実に参照できるようにする */
  const newTabUrlWindowIdRef = useRef(newTabUrlWindowId)
  const newTabUrlRef = useRef(newTabUrl)
  newTabUrlWindowIdRef.current = newTabUrlWindowId
  newTabUrlRef.current = newTabUrl

  const runPickerCycleBulkModeKeys = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return false
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return false
      }

      if (groupNewPhase === "meta" || newTabUrlWindowId !== null) {
        const ae = document.activeElement
        if (
          ae === groupMetaTitleRef.current ||
          groupMetaColorStripRef.current?.contains(ae ?? null)
        ) {
          return false
        }
      }

      const rowIndex = visibleRowIndices[hi]
      const row = rowIndex !== undefined ? rows[rowIndex] : undefined
      if (!row) {
        return false
      }

      const step = e.key === "ArrowRight" ? 1 : -1
      const shouldAutoMarkTab =
        row.kind === "tab" && !markedTabSet.has(row.tabId)

      e.preventDefault()
      e.stopPropagation()

      if (shouldAutoMarkTab) {
        applyReducedStateSequence([
          {
            kind: "toggleCurrent",
            row: { kind: "tab", tabId: row.tabId }
          },
          {
            kind: "cycleSubMode",
            direction: step
          }
        ])
        return true
      }

      let implicitKind: SelectKind | undefined
      if (markedCount === 0 || markedKind === null) {
        implicitKind =
          row.kind === "tab" ? "tab" : row.kind === "window" ? "window" : "group"
      }

      applyReducedState({
        kind: "cycleSubMode",
        direction: step,
        ...(implicitKind !== undefined ? { implicitKind } : {})
      })
      return true
    },
    [
      applyReducedState,
      applyReducedStateSequence,
      groupMetaColorStripRef,
      groupMetaTitleRef,
      groupNewPhase,
      hi,
      markedCount,
      markedKind,
      markedTabSet,
      newTabUrlWindowId,
      rows,
      visibleRowIndices
    ]
  )

  const runPickerEnterKey = useCallback(
    (e: KeyboardEvent): boolean => {
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }

      if (newTabUrlWindowIdRef.current !== null) {
        e.preventDefault()
        e.stopPropagation()
        const wid = newTabUrlWindowIdRef.current
        const raw = groupMetaTitleRef.current?.value ?? newTabUrlRef.current
        void executeOpenNewTabFromUrl(wid, raw)
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

      e.preventDefault()
      e.stopPropagation()

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
      executeCreateNewGroup,
      executeOpenNewTabFromUrl,
      groupMetaColorStripRef,
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

  const runPickerVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      const navDir = verticalNavDirection(e)
      if (navDir === null) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return false
      }

      if (groupNewPhase === "meta" || newTabUrlWindowId !== null) {
        const ae = document.activeElement
        if (
          ae === groupMetaTitleRef.current ||
          groupMetaColorStripRef.current?.contains(ae ?? null)
        ) {
          return false
        }
      }

      if (bulkSubMode === "move") {
        e.preventDefault()
        e.stopPropagation()
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
        e.preventDefault()
        e.stopPropagation()
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
        bulkSubMode === "group" || groupNewPhase === "meta" || newTabUrlWindowId !== null
      if (
        !shiftArrowBlocksBulk &&
        e.shiftKey &&
        (isPhysicalArrowDown(e) || isPhysicalArrowUp(e))
      ) {
        e.preventDefault()
        e.stopPropagation()
        if (visibleRowIndices.length === 0) {
          return true
        }
        const n = visibleRowIndices.length
        if (shiftRangeAnchorHiRef.current === null) {
          shiftRangeAnchorHiRef.current = hi
        }
        const anchor = shiftRangeAnchorHiRef.current
        let newHi = hi
        if (isPhysicalArrowDown(e)) {
          newHi = (hi + 1) % n
        } else {
          newHi = (hi - 1 + n) % n
        }
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
        e.preventDefault()
        e.stopPropagation()
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

      e.preventDefault()
      e.stopPropagation()
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
      if (runPickerVerticalNav(ev)) {
        logBmxtKey("picker", "handled", {
          handler: "verticalNav",
          key: ev.key,
          code: ev.code
        })
        return
      }
      if (runPickerCycleBulkModeKeys(ev)) {
        logBmxtKey("picker", "handled", {
          handler: "cycleBulkMode",
          key: ev.key,
          code: ev.code
        })
        return
      }
      if (runPickerEnterKey(ev)) {
        return
      }
    },
    [runPickerCycleBulkModeKeys, runPickerEnterKey, runPickerVerticalNav]
  )

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }

      if (runPickerVerticalNav(e.nativeEvent)) {
        return
      }
      if (runPickerCycleBulkModeKeys(e.nativeEvent)) {
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
        onExit()
        return
      }

      if (e.key === "Tab") {
        if (groupNewPhase === "meta" || newTabUrlWindowId !== null) {
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

      if (e.key === " " && (groupNewPhase === "meta" || newTabUrlWindowId !== null)) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (e.key === "Enter") {
        if (runPickerEnterKey(e.nativeEvent)) {
          return
        }
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        if (!searchMode) {
          setSearchMode(true)
        }
        return
      }

      if (!searchMode) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
        }
      }
    },
    [
      applyReducedState,
      bulkSubMode,
      closeSearch,
      executeCreateNewGroup,
      groupNewPhase,
      hi,
      markedCount,
      markedTabIds,
      newTabUrlWindowId,
      onExit,
      runPickerCycleBulkModeKeys,
      runPickerEnterKey,
      runPickerVerticalNav,
      rows,
      searchMode,
      setBulkSubMode,
      setGroupNewPhase,
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
