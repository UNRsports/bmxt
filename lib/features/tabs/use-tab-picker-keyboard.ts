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
import type {
  ActionMenuPanel,
  BulkSubMode,
  EditPanel,
  GroupChoice,
  SelectKind
} from "./tab-picker-overlay-types"
import { useTabPickerPlainExtensions } from "./use-tab-picker-plain-extensions"

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
  commandMode,
  commandBuffer,
  setCommandMode,
  setCommandBuffer,
  setCommandListingHint,
  isHostPaneFocused,
  sessionId,
  editPanel,
  actionMenuPanel,
  openActionMenuFromPicker,
  closeActionMenu,
  confirmActionMenuPick,
  cycleActionMenuPick,
  openEditFromPicker,
  closeEdit,
  confirmWindowRename,
  confirmGroupRename,
  confirmGroupMenuPick,
  cycleGroupMenuPick,
  backFromGroupRename,
  collapseAtRow,
  expandAtRow,
  isWindowExpanded,
  isGroupExpanded,
  altKeyHeldRef,
  onExitToDetailBar
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
  commandMode: boolean
  commandBuffer: string
  setCommandMode: Dispatch<SetStateAction<boolean>>
  setCommandBuffer: Dispatch<SetStateAction<string>>
  setCommandListingHint: Dispatch<SetStateAction<boolean>>
  isHostPaneFocused: boolean
  sessionId: string
  editPanel: EditPanel | null
  actionMenuPanel: ActionMenuPanel | null
  openActionMenuFromPicker: () => void
  closeActionMenu: () => void
  confirmActionMenuPick: () => void | Promise<void>
  cycleActionMenuPick: (delta: number) => void
  openEditFromPicker: () => void | Promise<void>
  closeEdit: () => void
  confirmWindowRename: () => void | Promise<void>
  confirmGroupRename: () => void | Promise<void>
  confirmGroupMenuPick: () => void | Promise<void>
  cycleGroupMenuPick: (delta: number) => void
  backFromGroupRename: () => void
  collapseAtRow: (row: TabPickerRow) => number | null
  expandAtRow: (row: TabPickerRow) => number | null
  isWindowExpanded: (windowId: number) => boolean
  isGroupExpanded: (windowId: number, groupId: number | null) => boolean
  altKeyHeldRef: MutableRefObject<boolean>
  onExitToDetailBar?: () => void
}) {
  const newTabUrlWindowIdRef = useRef(newTabUrlWindowId)
  const newTabUrlRef = useRef(newTabUrl)
  newTabUrlWindowIdRef.current = newTabUrlWindowId
  newTabUrlRef.current = newTabUrl

  const clearCommandMode = useCallback(() => {
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
  }, [setCommandBuffer, setCommandListingHint, setCommandMode])

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
    commandMode,
    commandBuffer,
    clearCommandMode,
    setCommandListingHint,
    hlSearchPattern,
    editPanel,
    actionMenuPanel,
    openActionMenuFromPicker,
    closeActionMenu,
    confirmActionMenuPick,
    cycleActionMenuPick,
    openEditFromPicker,
    closeEdit,
    confirmWindowRename,
    confirmGroupRename,
    confirmGroupMenuPick,
    cycleGroupMenuPick,
    backFromGroupRename,
    collapseAtRow,
    expandAtRow,
    isWindowExpanded,
    isGroupExpanded,
    altKeyHeldRef,
    onExitToDetailBar
  })

  const { onInputKeyDown } = usePlainPickerKeyboard({
    lineCount: visibleRowIndices.length,
    keyboardActive: isHostPaneFocused,
    sessionId,
    enableCommandMode: false,
    onReturnToPrompt,
    onConfirmLineIndex: () => {
      void confirmSelection()
    },
    hi,
    setHi,
    searchMode,
    setSearchMode,
    filterQuery,
    setFilterQuery,
    hlSearchPattern,
    setHlSearchPattern,
    onSearchCommit: commitSearchFoldSession,
    commandMode,
    setCommandMode,
    commandBuffer,
    setCommandBuffer,
    setCommandListingHint,
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
          requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
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
          requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
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
          requestAnimationFrame(() => groupMetaTitleRef.current?.focus({ preventScroll: true }))
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
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        requestAnimationFrame(() => groupMetaColorStripRef.current?.focus({ preventScroll: true }))
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
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
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
        requestAnimationFrame(() => groupMetaTitleRef.current?.focus({ preventScroll: true }))
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
