import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { TabPickerRow } from "./picker-rows"
import { resolvePickerHeadline } from "./state-machine"
import { usePickerReducerBridge } from "./use-picker-reducer-bridge"
import { useLoadGroupChoicesWhenBulkGroup } from "./use-load-group-choices"
import { useMirrorBrowserActiveTab } from "./use-mirror-browser-active-tab"
import { useSyncChromeTabStripPreview } from "./use-sync-chrome-tab-strip-preview"
import { pickerMarkedCount, useTabPickerDerivedState } from "./use-tab-picker-derived-state"
import { useWindowKeydownCapture } from "./use-window-keydown-capture"
import { useTabPickerExecution } from "./use-tab-picker-execution"
import { useTabPickerSyncAndLayoutEffects } from "./use-tab-picker-sync-and-layout"
import { useTabPickerKeyboard } from "./use-tab-picker-keyboard"
import {
  NEW_GROUP_LIST_SENTINEL,
  TAB_PICKER_COMMANDS_FOR_GROUP,
  TAB_PICKER_COMMANDS_FOR_TAB,
  TAB_PICKER_COMMANDS_FOR_WINDOW,
  filterTabPickerCommandCompletions
} from "./tab-picker-overlay-constants"
import type { BulkSubMode, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import {
  TabPickerCommandFooter,
  TabPickerGroupTargetPanel,
  TabPickerNewGroupMetaPanel,
  TabPickerNewTabUrlPanel,
  TabPickerSearchFooter
} from "./tab-picker-panels"
import { TabPickerRowList } from "./tab-picker-row-list"

type Props = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  onExit: () => void
  isHostPaneFocused: boolean
}

export function TabPickerOverlay({
  rows,
  showUrl,
  initialHi,
  variant = "default",
  onAppendLog,
  onRefreshRows,
  onExit,
  isHostPaneFocused
}: Props) {
  const [filterQuery, setFilterQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  /** `/` で確定したあとも維持するハイライト用クエリ（`:nohlsearch` で消す） */
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [hi, setHi] = useState(initialHi)
  const [activeTabId, setActiveTabId] = useState<number | null>(() => {
    const atHi = rows[initialHi]
    if (atHi?.kind === "tab") {
      return atHi.tabId
    }
    const firstActive = rows.find((row) => row.kind === "tab" && row.active)
    return firstActive?.kind === "tab" ? firstActive.tabId : null
  })
  const [markedKind, setMarkedKind] = useState<SelectKind | null>(null)
  const [markedTabIds, setMarkedTabIds] = useState<number[]>([])
  const [markedWindowIds, setMarkedWindowIds] = useState<number[]>([])
  const [markedGroupKeys, setMarkedGroupKeys] = useState<string[]>([])
  const [bulkSubMode, setBulkSubMode] = useState<BulkSubMode | null>(null)
  const [moveDestHi, setMoveDestHi] = useState(initialHi)
  const [groupChoices, setGroupChoices] = useState<GroupChoice[]>([])
  const [groupPickIndex, setGroupPickIndex] = useState(0)
  const [groupNewPhase, setGroupNewPhase] = useState<"tabs" | "meta">("tabs")
  const [newGroupTitle, setNewGroupTitle] = useState("")
  const [newGroupColorIndex, setNewGroupColorIndex] = useState(0)
  const [newTabUrlWindowId, setNewTabUrlWindowId] = useState<number | null>(null)
  const [newTabUrl, setNewTabUrl] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const groupMetaTitleRef = useRef<HTMLInputElement>(null)
  const groupMetaColorStripRef = useRef<HTMLDivElement>(null)
  const newGroupTabIdsRef = useRef<number[]>([])
  const groupCreateInFlightRef = useRef(false)
  const rowElRefs = useRef<Map<number, HTMLDivElement | null>>(new Map())
  const anchorTabIdRef = useRef<number | null>(null)
  const skipNextInitialHiRef = useRef(false)
  const prevFilterQueryRef = useRef(filterQuery)
  const prevRowsRef = useRef(rows)
  const prevBulkSubModeRef = useRef<BulkSubMode | null>(null)
  const shiftRangeAnchorHiRef = useRef<number | null>(null)

  const {
    visibleRowIndices,
    markedTabSet,
    markedWindowSet,
    markedGroupSet,
    tabIdToWindowId,
    selectedTabIds
  } = useTabPickerDerivedState(rows, markedKind, markedTabIds, markedWindowIds, markedGroupKeys)

  const { applyReducedState, applyReducedStateSequence, clearMarkedViaReducer } =
    usePickerReducerBridge(
      hi,
      moveDestHi,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      bulkSubMode,
      setHi,
      setMoveDestHi,
      setMarkedKind,
      setMarkedTabIds,
      setMarkedWindowIds,
      setMarkedGroupKeys,
      setBulkSubMode
    )

  const { groupPanelRef } = useTabPickerSyncAndLayoutEffects({
    initialHi,
    filterQuery,
    rows,
    visibleRowIndices,
    hi,
    setHi,
    setMoveDestHi,
    groupNewPhase,
    newTabUrlWindowId,
    searchMode,
    inputRef,
    groupMetaTitleRef,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    setMarkedTabIds,
    setMarkedWindowIds,
    setMarkedGroupKeys,
    setBulkSubMode,
    setMarkedKind,
    bulkSubMode,
    moveDestHi,
    rowElRefs,
    groupChoices,
    groupPickIndex,
    shiftRangeAnchorHiRef,
    anchorTabIdRef,
    prevFilterQueryRef,
    prevRowsRef,
    prevBulkSubModeRef,
    skipNextInitialHiRef,
    isHostPaneFocused
  })

  useLoadGroupChoicesWhenBulkGroup(bulkSubMode, setGroupChoices, setGroupPickIndex)

  useSyncChromeTabStripPreview({
    hi,
    visibleRowIndices,
    rows,
    markedKind,
    markedTabIds,
    tabIdToWindowId,
    setActiveTabId
  })

  const markedCount = pickerMarkedCount(
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys
  )

  const mirrorBlocked =
    markedCount > 0 ||
    bulkSubMode !== null ||
    groupNewPhase !== "tabs" ||
    newTabUrlWindowId !== null ||
    commandMode

  useMirrorBrowserActiveTab({
    enabled: variant === "default",
    blocked: mirrorBlocked,
    rows,
    visibleRowIndices,
    setHi,
    setMoveDestHi,
    setActiveTabId,
    setFilterQuery,
    setSearchMode,
    anchorTabIdRef,
    onRefreshRows
  })

  const onPickerHighlightCreatedTab = useCallback((tabId: number) => {
    anchorTabIdRef.current = tabId
    skipNextInitialHiRef.current = true
  }, [])

  const {
    closeSearch,
    confirmSelection,
    executeCreateNewGroup,
    executeOpenNewTabFromUrl,
    runExecutionIntent
  } = useTabPickerExecution({
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    bulkSubMode,
    selectedTabIds,
    groupChoices,
    groupPickIndex,
    newGroupColorIndex,
    newGroupTitle,
    newGroupTabIdsRef,
    groupCreateInFlightRef,
    setActiveTabId,
    setNewGroupTitle,
    setNewGroupColorIndex,
    setGroupNewPhase,
    clearMarkedViaReducer,
    onAppendLog,
    onRefreshRows,
    setSearchMode,
    setFilterQuery,
    onNewTabUrlPanelDone: () => {
      setNewTabUrlWindowId(null)
      setNewTabUrl("")
      setBulkSubMode(null)
    },
    onPickerHighlightCreatedTab
  })

  const { onMetaTitleKeyDown, onMetaColorKeyDown, onWindowKeydownCapture, onInputKeyDown } =
    useTabPickerKeyboard({
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
      onExit,
    commandMode,
    commandBuffer,
    setCommandMode,
    setCommandBuffer,
    setCommandListingHint,
    isHostPaneFocused
  })

  useWindowKeydownCapture(onWindowKeydownCapture)

  const headLine = useMemo(
    () =>
      resolvePickerHeadline({
        bulkSubMode,
        groupNewPhase,
        variant
      }),
    [bulkSubMode, groupNewPhase, variant]
  )

  const searchHighlightQuery = searchMode ? filterQuery : hlSearchPattern

  const commandListingHintText = useMemo(() => {
    const targetKind: SelectKind | null = (() => {
      if (markedKind) {
        return markedKind
      }
      const rowIndex = visibleRowIndices[hi]
      const row = rowIndex === undefined ? undefined : rows[rowIndex]
      if (!row) {
        return null
      }
      if (row.kind === "tab") {
        return "tab"
      }
      if (row.kind === "window") {
        return "window"
      }
      return "group"
    })()

    const commands =
      targetKind === "tab"
        ? TAB_PICKER_COMMANDS_FOR_TAB
        : targetKind === "window"
          ? TAB_PICKER_COMMANDS_FOR_WINDOW
          : targetKind === "group"
            ? TAB_PICKER_COMMANDS_FOR_GROUP
            : TAB_PICKER_COMMANDS_FOR_TAB
    return commands.join(" · ")
  }, [hi, markedKind, rows, visibleRowIndices])

  const commandAmbiguousPlaceholder = useMemo(() => {
    if (!commandMode || commandBuffer.trim() === "") {
      return null
    }
    const matches = filterTabPickerCommandCompletions(commandBuffer)
    const uniq = [...new Set(matches)]
    if (uniq.length < 2) {
      return null
    }
    return `Tab で循環: ${uniq.join(" · ")}`
  }, [commandBuffer, commandMode])

  const setRowRef = useCallback((rowIndex: number, el: HTMLDivElement | null) => {
    if (el) {
      rowElRefs.current.set(rowIndex, el)
    } else {
      rowElRefs.current.delete(rowIndex)
    }
  }, [])

  useLayoutEffect(() => {
    if (commandMode && isHostPaneFocused) {
      inputRef.current?.focus()
    }
  }, [commandMode, isHostPaneFocused])

  useLayoutEffect(() => {
    prevFilterQueryRef.current = filterQuery
    prevRowsRef.current = rows
  })

  return (
    <div
      className="bmxt-tab-picker"
      onMouseDown={(ev) => {
        const t = ev.target as HTMLElement
        if (t.closest(".bmxt-tab-picker-new-group-meta")) {
          return
        }
        if (groupNewPhase === "meta" || newTabUrlWindowId !== null) {
          return
        }
        requestAnimationFrame(() => inputRef.current?.focus())
      }}>
      <div className="bmxt-tab-picker-head">{headLine}</div>
      <textarea
        ref={inputRef}
        className="bmxt-tab-picker-filter-ime"
        rows={1}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={
          searchMode ? "Search highlight" : commandMode ? "Command input" : "Tab picker key input"
        }
        value={searchMode ? filterQuery : commandMode ? commandBuffer : ""}
        onChange={(e) => {
          if (searchMode) {
            setFilterQuery(e.target.value)
          } else if (commandMode) {
            const v = e.target.value
            setCommandBuffer(v)
            if (v.trim() !== "") {
              setCommandListingHint(false)
            }
          }
        }}
        onKeyDown={onInputKeyDown}
        onCompositionEnd={(e) => {
          if (searchMode) {
            setFilterQuery(e.currentTarget.value)
          }
        }}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none"
        }}
      />
      <div
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label="Tabs"
        aria-multiselectable={true}
        aria-activedescendant={
          visibleRowIndices[hi] !== undefined ? `bmxt-tab-row-${visibleRowIndices[hi]}` : undefined
        }>
        <TabPickerRowList
          rows={rows}
          visibleRowIndices={visibleRowIndices}
          hi={hi}
          moveDestHi={moveDestHi}
          bulkSubMode={bulkSubMode}
          markedWindowSet={markedWindowSet}
          markedGroupSet={markedGroupSet}
          markedTabSet={markedTabSet}
          activeTabId={activeTabId}
          showUrl={showUrl}
          searchHighlightQuery={searchHighlightQuery}
          setRowRef={setRowRef}
        />
      </div>
      {bulkSubMode === "group" && variant === "default" && groupNewPhase !== "meta" ? (
        <TabPickerGroupTargetPanel
          panelRef={groupPanelRef}
          groupChoices={groupChoices}
          groupPickIndex={groupPickIndex}
        />
      ) : null}
      {newTabUrlWindowId !== null ? (
        <TabPickerNewTabUrlPanel
          groupMetaTitleRef={groupMetaTitleRef}
          newTabUrl={newTabUrl}
          onNewTabUrlChange={setNewTabUrl}
          onKeyDown={onMetaTitleKeyDown}
        />
      ) : groupNewPhase === "meta" ? (
        <TabPickerNewGroupMetaPanel
          groupMetaTitleRef={groupMetaTitleRef}
          groupMetaColorStripRef={groupMetaColorStripRef}
          newGroupTitle={newGroupTitle}
          onNewGroupTitleChange={setNewGroupTitle}
          newGroupColorIndex={newGroupColorIndex}
          onMetaTitleKeyDown={onMetaTitleKeyDown}
          onMetaColorKeyDown={onMetaColorKeyDown}
        />
      ) : null}
      {searchMode ? <TabPickerSearchFooter filterQuery={filterQuery} /> : null}
      {commandMode ? (
        <TabPickerCommandFooter
          commandBuffer={commandBuffer}
          showListingHint={commandListingHint}
          listingHintText={commandListingHintText}
          ambiguousPlaceholder={commandAmbiguousPlaceholder}
        />
      ) : null}
    </div>
  )
}
