import type { MutableRefObject, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useCallback, useRef } from "react"
import { usePlainPickerKeyboard } from "../side-picker/hooks/use-plain-picker-keyboard"
import type { TabPickerRow } from "./picker-rows"
import type { ExecutionIntent } from "./controller/execute-actions"
import type { PickerReducerEvent } from "./state-machine"
import {
  NEW_GROUP_COLORS
} from "./tab-picker-overlay-constants"
import type { BulkSubMode, EditPanel, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import { useTabPickerPlainExtensions } from "./use-tab-picker-plain-extensions"
import type { TabPickerActionId, TabPickerListView } from "./tab-picker-actions"
import type { TabPickerActionRow } from "./use-tab-picker-action-view"

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
  pickerViewRef,
  actionHi,
  actionHiRef,
  setActionHi,
  actionRows,
  actionRowsRef,
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
  commitSearchFoldSession: (query: string) => void
  onReturnToPrompt: () => void
  isHostPaneFocused: boolean
  sessionId: string
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
  pickerViewRef: MutableRefObject<TabPickerListView>
  actionHi: number
  actionHiRef: MutableRefObject<number>
  setActionHi: Dispatch<SetStateAction<number>>
  actionRows: TabPickerActionRow[]
  actionRowsRef: MutableRefObject<TabPickerActionRow[]>
  enterActionView: () => boolean
  exitActionView: () => void
  commitAction: (actionId: TabPickerActionId) => void | Promise<void>
  canEnterActionView: boolean
}) {
  const newTabUrlWindowIdRef = useRef(newTabUrlWindowId)
  const newTabUrlRef = useRef(newTabUrl)
  newTabUrlWindowIdRef.current = newTabUrlWindowId
  newTabUrlRef.current = newTabUrl

  const extensions = useTabPickerPlainExtensions({
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
    pickerViewRef,
    actionHi,
    actionHiRef,
    setActionHi,
    actionRows,
    actionRowsRef,
    enterActionView,
    exitActionView,
    commitAction,
    canEnterActionView
  })

  const keyboardLineCount =
    pickerView === "actions" ? actionRows.length : visibleRowIndices.length
  const keyboardHi = pickerView === "actions" ? actionHi : hi
  const keyboardSetHi = pickerView === "actions" ? setActionHi : setHi

  const { onInputKeyDown } = usePlainPickerKeyboard({
    lineCount: keyboardLineCount,
    keyboardActive: isHostPaneFocused,
    sessionId,
    enableCommandMode: false,
    onReturnToPrompt,
    onConfirmLineIndex: () => {
      void confirmSelection()
    },
    hi: keyboardHi,
    setHi: keyboardSetHi,
    searchMode,
    setSearchMode,
    filterQuery,
    setFilterQuery,
    hlSearchPattern,
    setHlSearchPattern,
    onSearchCommit: commitSearchFoldSession,
    commandMode: false,
    setCommandMode: () => undefined,
    commandBuffer: "",
    setCommandBuffer: () => undefined,
    setCommandListingHint: () => undefined,
    extensions
  })

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

  return {
    onMetaTitleKeyDown,
    onMetaColorKeyDown,
    onInputKeyDown
  }
}
