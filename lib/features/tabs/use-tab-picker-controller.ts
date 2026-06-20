import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import { resolvePickerHeadline, type PickerReducerEvent } from "./state-machine"
import { useLoadGroupChoicesWhenBulkGroup } from "./use-load-group-choices"
import { useMirrorBrowserActiveTab } from "./use-mirror-browser-active-tab"
import { usePickerAltKeyTracking } from "../side-picker/preview/use-picker-alt-key-tracking"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import { useSyncChromeTabStripPreview } from "./use-sync-chrome-tab-strip-preview"
import { pickerMarkedCount, useTabPickerDerivedState } from "./use-tab-picker-derived-state"
import { computeTabPickerVisibleRowIndices } from "./tab-picker-fold-state"
import { useTabPickerFoldState } from "./use-tab-picker-fold-state"
import { useTabPickerExecution } from "./use-tab-picker-execution"
import { useTabPickerSyncAndLayoutEffects } from "./use-tab-picker-sync-and-layout"
import { useTabPickerKeyboard } from "./use-tab-picker-keyboard"
import { useTabPickerEdit } from "./use-tab-picker-edit"
import { useTabPickerActionView } from "./use-tab-picker-action-view"
import type { BulkSubMode } from "./tab-picker-overlay-types"
import type { TabPickerViewProps } from "./tab-picker-view-types"
import type { TabsPageActiveMode } from "./page-active-setting"
import { useUiCopy } from "../setting"
import { useTrackedWindowDisplay } from "./use-tracked-window-display"
import { useTabPickerLiveFieldsRevision } from "./use-tab-picker-live-fields-revision"
import { tabPickerRowsStructureKey } from "./tab-picker-rows-structure"
import {
  createTabPickerEngineFieldSetter,
  useTabPickerEngineState,
  type TabPickerEngineDispatch,
  type TabPickerEngineState
} from "./engine"

const INACTIVE_ENGINE_STATE: TabPickerEngineState = {
  rows: [],
  showUrl: false,
  variant: "default",
  initialHi: 0,
  anchorTabId: null,
  hi: 0,
  moveDestHi: 0,
  markedKind: null,
  markedTabIds: [],
  markedWindowIds: [],
  markedGroupKeys: [],
  bulkSubMode: null,
  filterQuery: "",
  searchMode: false,
  hlSearchPattern: "",
  commandMode: false,
  commandBuffer: "",
  commandListingHint: false,
  activeTabId: null,
  groupChoices: [],
  groupPickIndex: 0,
  groupNewPhase: "tabs",
  newGroupTitle: "",
  newGroupColorIndex: 0,
  newTabUrlWindowId: null,
  newTabUrl: "",
  editPanel: null,
  editTitle: ""
}

const noopEngineDispatch: TabPickerEngineDispatch = () => {}

type Props = {
  pageActiveMode?: TabsPageActiveMode
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  scheduleRefreshRows?: () => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  isHostPaneFocused: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId: string
  onFocusTabIdChange?: (tabId: number | null) => void
}

export type TabPickerOverlayProps = Props

function useEngineFieldSetters(dispatch: TabPickerEngineDispatch) {
  return useMemo(
    () => ({
      setHi: createTabPickerEngineFieldSetter(dispatch, "hi"),
      setMoveDestHi: createTabPickerEngineFieldSetter(dispatch, "moveDestHi"),
      setMarkedKind: createTabPickerEngineFieldSetter(dispatch, "markedKind"),
      setMarkedTabIds: createTabPickerEngineFieldSetter(dispatch, "markedTabIds"),
      setMarkedWindowIds: createTabPickerEngineFieldSetter(dispatch, "markedWindowIds"),
      setMarkedGroupKeys: createTabPickerEngineFieldSetter(dispatch, "markedGroupKeys"),
      setBulkSubMode: createTabPickerEngineFieldSetter(dispatch, "bulkSubMode"),
      setFilterQuery: createTabPickerEngineFieldSetter(dispatch, "filterQuery"),
      setSearchMode: createTabPickerEngineFieldSetter(dispatch, "searchMode"),
      setHlSearchPattern: createTabPickerEngineFieldSetter(dispatch, "hlSearchPattern"),
      setCommandMode: createTabPickerEngineFieldSetter(dispatch, "commandMode"),
      setCommandBuffer: createTabPickerEngineFieldSetter(dispatch, "commandBuffer"),
      setCommandListingHint: createTabPickerEngineFieldSetter(dispatch, "commandListingHint"),
      setActiveTabId: createTabPickerEngineFieldSetter(dispatch, "activeTabId"),
      setGroupChoices: createTabPickerEngineFieldSetter(dispatch, "groupChoices"),
      setGroupPickIndex: createTabPickerEngineFieldSetter(dispatch, "groupPickIndex"),
      setGroupNewPhase: createTabPickerEngineFieldSetter(dispatch, "groupNewPhase"),
      setNewGroupTitle: createTabPickerEngineFieldSetter(dispatch, "newGroupTitle"),
      setNewGroupColorIndex: createTabPickerEngineFieldSetter(dispatch, "newGroupColorIndex"),
      setNewTabUrlWindowId: createTabPickerEngineFieldSetter(dispatch, "newTabUrlWindowId"),
      setNewTabUrl: createTabPickerEngineFieldSetter(dispatch, "newTabUrl"),
      setEditPanel: createTabPickerEngineFieldSetter(dispatch, "editPanel"),
      setEditTitle: createTabPickerEngineFieldSetter(dispatch, "editTitle")
    }),
    [dispatch]
  )
}

export function useTabPickerController({
  pageActiveMode = "auto",
  onAppendLog,
  onRefreshRows,
  scheduleRefreshRows,
  onReturnToPrompt,
  onExitToDetailBar,
  isHostPaneFocused,
  pickerInputRef,
  sessionId,
  onFocusTabIdChange
}: Props): TabPickerViewProps | null {
  const uiCopy = useUiCopy()
  const engineApi = useTabPickerEngineState(sessionId)
  useTabPickerLiveFieldsRevision()

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
  const prevFilterQueryRef = useRef("")
  const prevRowsStructureKeyRef = useRef("")
  const prevBulkSubModeRef = useRef<BulkSubMode | null>(null)
  const shiftRangeAnchorHiRef = useRef<number | null>(null)
  const altKeyHeldRef = useRef(false)
  const mirrorHiPendingRef = useRef(false)
  const [altPreviewTick, setAltPreviewTick] = useState(0)

  const engineReady = engineApi !== null
  const state = engineApi?.state ?? INACTIVE_ENGINE_STATE
  const dispatch = engineApi?.dispatch ?? noopEngineDispatch

  const {
    rows,
    showUrl,
    initialHi,
    variant,
    hi,
    moveDestHi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    bulkSubMode,
    filterQuery,
    searchMode,
    hlSearchPattern,
    commandMode,
    commandBuffer,
    commandListingHint,
    activeTabId,
    groupChoices,
    groupPickIndex,
    groupNewPhase,
    newGroupTitle,
    newGroupColorIndex,
    newTabUrlWindowId,
    newTabUrl,
    editPanel,
    editTitle
  } = state

  const setters = useEngineFieldSetters(dispatch)
  const {
    setHi,
    setMoveDestHi,
    setMarkedKind,
    setMarkedTabIds,
    setMarkedWindowIds,
    setMarkedGroupKeys,
    setBulkSubMode,
    setFilterQuery,
    setSearchMode,
    setHlSearchPattern,
    setCommandMode,
    setCommandBuffer,
    setCommandListingHint,
    setActiveTabId,
    setGroupChoices,
    setGroupPickIndex,
    setGroupNewPhase,
    setNewGroupTitle,
    setNewGroupColorIndex,
    setNewTabUrlWindowId,
    setNewTabUrl,
    setEditPanel,
    setEditTitle
  } = setters

  useEffect(() => {
    anchorTabIdRef.current = state.anchorTabId
  }, [state.anchorTabId])

  const {
    visibleRowIndices,
    collapseAtRow,
    expandAtRow,
    toggleFoldAtRow,
    expandForTabId,
    isWindowExpanded,
    isGroupExpanded,
    commitSearchFoldSession
  } = useTabPickerFoldState(rows, searchMode, filterQuery)

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

  const clearMirrorHiPendingForUserMove = useCallback((events: PickerReducerEvent[]) => {
    if (events.some((ev) => ev.kind === "moveHi")) {
      mirrorHiPendingRef.current = false
    }
  }, [])

  const applyReducedState = useCallback(
    (ev: PickerReducerEvent) => {
      clearMirrorHiPendingForUserMove([ev])
      dispatch({ type: "reducer", event: ev, visibleLen: visibleRowIndices.length })
    },
    [clearMirrorHiPendingForUserMove, dispatch, visibleRowIndices.length]
  )

  const applyReducedStateSequence = useCallback(
    (events: PickerReducerEvent[]) => {
      clearMirrorHiPendingForUserMove(events)
      dispatch({ type: "reducerSequence", events, visibleLen: visibleRowIndices.length })
    },
    [clearMirrorHiPendingForUserMove, dispatch, visibleRowIndices.length]
  )

  const clearMarkedViaReducer = useCallback(() => {
    applyReducedState({ kind: "clearMarked" })
  }, [applyReducedState])

  const setAnchorTabId = useCallback(
    (tabId: number | null) => {
      anchorTabIdRef.current = tabId
      dispatch({
        type: "update",
        updater: (prev) => (prev.anchorTabId === tabId ? prev : { ...prev, anchorTabId: tabId })
      })
    },
    [dispatch]
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
    prevRowsStructureKeyRef,
    prevBulkSubModeRef,
    skipNextInitialHiRef,
    isHostPaneFocused,
    editPanel,
    editPanelRef,
    setAnchorTabId
  })

  useLoadGroupChoicesWhenBulkGroup(bulkSubMode, setGroupChoices, setGroupPickIndex)

  const markedCount = pickerMarkedCount(
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys
  )

  useSyncChromeTabStripPreview({
    hi,
    visibleRowIndices,
    rows,
    markedKind,
    markedTabIds,
    tabIdToWindowId,
    setActiveTabId,
    pageActiveMode,
    altKeyHeldRef,
    mirrorHiPendingRef,
    isHostPaneFocused,
    altPreviewTick
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

  const { trackedWindowId, trackedWindowTitle } = useTrackedWindowDisplay(activeTabId)

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

  const onPickerHighlightCreatedTab = useCallback(
    (tabId: number) => {
      setAnchorTabId(tabId)
      skipNextInitialHiRef.current = true
    },
    [setAnchorTabId]
  )

  const {
    closeSearch,
    confirmSelection,
    executeCreateNewGroup,
    executeOpenNewTabFromUrl,
    executeCloseForReducerState,
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
    setBulkSubMode,
    onNewTabUrlPanelDone: () => {
      setNewTabUrlWindowId(null)
      setNewTabUrl("")
      setBulkSubMode(null)
    },
    onPickerHighlightCreatedTab
  })

  const {
    pickerView,
    actionHi,
    setActionHi,
    actionRows,
    enterActionView,
    exitActionView,
    commitAction,
    canEnterActionView
  } = useTabPickerActionView({
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    markedCount,
    selectedTabIds,
    hlSearchPattern,
    bulkSubMode,
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
  })

  const onAltToggleFold = useCallback(
    (e: KeyboardEvent) => {
      if (
        !isHostPaneFocused ||
        pickerView === "actions" ||
        searchMode ||
        bulkSubMode !== null ||
        groupNewPhase === "meta" ||
        newTabUrlWindowId !== null ||
        editPanel !== null ||
        visibleRowIndices.length === 0
      ) {
        return
      }
      const rowIndex = visibleRowIndices[hi]
      const row = rowIndex !== undefined ? rows[rowIndex] : undefined
      if (!row || (row.kind !== "window" && row.kind !== "group")) {
        return
      }
      pickerStopEvent(e)
      const focusRowIdx = toggleFoldAtRow(row)
      if (focusRowIdx === null) {
        return
      }
      const newVisible = computeTabPickerVisibleRowIndices(rows)
      const newHi = newVisible.indexOf(focusRowIdx)
      if (newHi >= 0) {
        setHi(newHi)
      } else {
        setHi((h) => Math.min(h, Math.max(0, newVisible.length - 1)))
      }
    },
    [
      bulkSubMode,
      editPanel,
      groupNewPhase,
      hi,
      isHostPaneFocused,
      newTabUrlWindowId,
      pickerView,
      rows,
      searchMode,
      setHi,
      toggleFoldAtRow,
      visibleRowIndices
    ]
  )

  usePickerAltKeyTracking({
    enabled: true,
    altKeyHeldRef,
    bumpPreviewTickOnAltDown: pageActiveMode === "manual",
    setAltPreviewTick,
    onAltKeyDown: onAltToggleFold
  })

  const mirrorBlocked =
    markedCount > 0 ||
    bulkSubMode !== null ||
    groupNewPhase !== "tabs" ||
    newTabUrlWindowId !== null ||
    pickerView === "actions"

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
    expandForTabId,
    mirrorHiPendingRef,
    onRefreshRows,
    scheduleRefreshRows,
    altKeyHeldRef
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
    commitSearchFoldSession,
    onReturnToPrompt,
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
  })

  const headLine = useMemo(() => {
    if (pickerView === "actions") {
      return uiCopy.t("tabs.picker.headline.actions", {
        common: uiCopy.t("tabs.picker.headline.common")
      })
    }
    return resolvePickerHeadline(
      {
        bulkSubMode,
        groupNewPhase,
        variant,
        editPanelKind: editPanel?.kind ?? null
      },
      uiCopy.locale
    )
  }, [bulkSubMode, editPanel?.kind, groupNewPhase, pickerView, uiCopy, variant])

  const searchHighlightQuery = searchMode ? filterQuery : hlSearchPattern

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
    prevRowsStructureKeyRef.current = tabPickerRowsStructureKey(rows)
  })

  if (!engineReady) {
    return null
  }

  return {
    headLine,
    searchHighlightQuery,
    pickerView,
    actionHi,
    actionRows,
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
    trackedWindowId,
    trackedWindowTitle,
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
    isHostPaneFocused,
    inputRef
  }
}
