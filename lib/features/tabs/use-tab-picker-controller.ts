import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import type { TabPickerRow } from "./picker-rows"
import { resolvePickerHeadline } from "./state-machine"
import { usePickerReducerBridge } from "./use-picker-reducer-bridge"
import { useLoadGroupChoicesWhenBulkGroup } from "./use-load-group-choices"
import { useMirrorBrowserActiveTab } from "./use-mirror-browser-active-tab"
import { useSyncChromeTabStripPreview } from "./use-sync-chrome-tab-strip-preview"
import { pickerMarkedCount, useTabPickerDerivedState } from "./use-tab-picker-derived-state"
import { useTabPickerFoldState } from "./use-tab-picker-fold-state"
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
import type { BulkSubMode, EditPanel, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import { useTabPickerEdit } from "./use-tab-picker-edit"
import type { TabPickerViewProps } from "./tab-picker-view-types"
import type { TabPickerInteractiveSnapshot } from "../side-picker/session/tab-picker-state"
import { emptyTabPickerInteractiveSnapshot } from "../side-picker/session/tab-picker-state"

type Props = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
  interactive?: TabPickerInteractiveSnapshot
  onInteractiveSnapshotChange?: (snapshot: TabPickerInteractiveSnapshot) => void
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  /** EN: Esc at top level — return focus to BMXt prompt; picker stays open. */
  onReturnToPrompt: () => void
  /** EN: Pane has keyboard focus (Ctrl+←→ or click); when false, display-only. */
  isHostPaneFocused: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  /** EN: Session leaf id for Ctrl+←→ pane-strip navigation. */
  sessionId: string
  /** EN: Fires when hi moves to a tab row (or off tab rows). Used by dom -list follow. */
  onFocusTabIdChange?: (tabId: number | null) => void
}

export type TabPickerOverlayProps = Props

export function useTabPickerController({
  rows,
  showUrl,
  initialHi,
  variant = "default",
  interactive,
  onInteractiveSnapshotChange,
  onAppendLog,
  onRefreshRows,
  onReturnToPrompt,
  isHostPaneFocused,
  pickerInputRef,
  sessionId,
  onFocusTabIdChange
}: Props) {
  const restored = interactive ?? emptyTabPickerInteractiveSnapshot()
  const [filterQuery, setFilterQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  /** `/` で確定したあとも維持するハイライト用クエリ（`:nohlsearch` で消す） */
  const [hlSearchPattern, setHlSearchPattern] = useState(restored.hlSearchPattern)
  const [hi, setHi] = useState(initialHi)
  const [activeTabId, setActiveTabId] = useState<number | null>(() => {
    if (restored.anchorTabId !== null) {
      return restored.anchorTabId
    }
    const atHi = rows[initialHi]
    if (atHi?.kind === "tab") {
      return atHi.tabId
    }
    const firstActive = rows.find((row) => row.kind === "tab" && row.active)
    return firstActive?.kind === "tab" ? firstActive.tabId : null
  })
  const [markedKind, setMarkedKind] = useState<SelectKind | null>(restored.markedKind)
  const [markedTabIds, setMarkedTabIds] = useState<number[]>(restored.markedTabIds)
  const [markedWindowIds, setMarkedWindowIds] = useState<number[]>(restored.markedWindowIds)
  const [markedGroupKeys, setMarkedGroupKeys] = useState<string[]>(restored.markedGroupKeys)
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
  const [editPanel, setEditPanel] = useState<EditPanel | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const setInputEl = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el
      if (pickerInputRef) {
        pickerInputRef.current = el
      }
    },
    [pickerInputRef]
  )
  const editPanelRef = useRef<HTMLDivElement>(null)
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
    collapseAtRow,
    expandAtRow,
    isWindowExpanded,
    isGroupExpanded
  } = useTabPickerFoldState(rows)

  const {
    markedTabSet,
    markedWindowSet,
    markedGroupSet,
    tabIdToWindowId,
    selectedTabIds
  } = useTabPickerDerivedState(
    rows,
    visibleRowIndices,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys
  )

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
    isHostPaneFocused,
    editPanel,
    editPanelRef
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

  useEffect(() => {
    if (!onFocusTabIdChange) {
      return
    }
    if (visibleRowIndices.length === 0) {
      onFocusTabIdChange(null)
      return
    }
    const rowIndex = visibleRowIndices[hi]
    if (rowIndex === undefined) {
      onFocusTabIdChange(null)
      return
    }
    const row = rows[rowIndex]
    onFocusTabIdChange(row?.kind === "tab" ? row.tabId : null)
  }, [hi, visibleRowIndices, rows, onFocusTabIdChange])

  useEffect(() => {
    if (!onInteractiveSnapshotChange) {
      return
    }
    const rowIndex = visibleRowIndices[hi]
    const row = rowIndex !== undefined ? rows[rowIndex] : undefined
    onInteractiveSnapshotChange({
      anchorTabId: row?.kind === "tab" ? row.tabId : null,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      hlSearchPattern
    })
  }, [
    hi,
    hlSearchPattern,
    markedGroupKeys,
    markedKind,
    markedTabIds,
    markedWindowIds,
    onInteractiveSnapshotChange,
    rows,
    visibleRowIndices
  ])

  const markedCount = pickerMarkedCount(
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys
  )

  const {
    openEditFromPicker,
    closeEdit,
    confirmWindowRename,
    confirmGroupRename,
    confirmGroupMenuPick,
    cycleGroupMenuPick,
    backFromGroupRename
  } = useTabPickerEdit({
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
  })

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

  const { onMetaTitleKeyDown, onMetaColorKeyDown, onInputKeyDown } = useTabPickerKeyboard({
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
    openEditFromPicker,
    closeEdit,
    confirmWindowRename,
    confirmGroupRename,
    confirmGroupMenuPick,
    cycleGroupMenuPick,
    backFromGroupRename,
    collapseAtRow,
    expandAtRow
  })

  const headLine = useMemo(
    () =>
      resolvePickerHeadline({
        bulkSubMode,
        groupNewPhase,
        variant,
        editPanelKind: editPanel?.kind ?? null
      }),
    [bulkSubMode, editPanel?.kind, groupNewPhase, variant]
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
    if (isHostPaneFocused) {
      inputRef.current?.focus()
    }
  }, [isHostPaneFocused])

  useLayoutEffect(() => {
    prevFilterQueryRef.current = filterQuery
    prevRowsRef.current = rows
  })


  const viewProps: TabPickerViewProps = {
    headLine,
    searchHighlightQuery,
    commandListingHintText,
    commandAmbiguousPlaceholder,
    setInputEl,
    onInputKeyDown,
    onMetaTitleKeyDown,
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    bulkSubMode,
    markedWindowSet,
    markedGroupSet,
    markedTabSet,
    activeTabId,
    showUrl,
    setRowRef,
    isWindowExpanded,
    isGroupExpanded,
    variant,
    groupNewPhase,
    groupPanelRef,
    groupChoices,
    groupPickIndex,
    newTabUrlWindowId,
    groupMetaTitleRef,
    newTabUrl,
    setNewTabUrl,
    editPanel,
    groupMetaColorStripRef,
    newGroupTitle,
    setNewGroupTitle,
    newGroupColorIndex,
    onMetaColorKeyDown,
    editTitle,
    setEditTitle,
    editPanelRef,
    searchMode,
    filterQuery,
    setFilterQuery,
    commandMode,
    commandBuffer,
    setCommandBuffer,
    setCommandListingHint,
    commandListingHint,
    isHostPaneFocused,
    inputRef
  }
  return viewProps
}
