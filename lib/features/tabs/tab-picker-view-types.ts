import type { Dispatch, RefObject, SetStateAction } from "react"
import type { TabPickerRow } from "./picker-rows"
import type { ActionMenuPanel, BulkSubMode, EditPanel, GroupChoice } from "./tab-picker-overlay-types"

export type TabPickerViewProps = {
  headLine: string
  searchHighlightQuery: string
  setInputEl: (el: HTMLTextAreaElement | null) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onMetaTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  moveDestHi: number
  bulkSubMode: BulkSubMode | null
  markedWindowSet: Set<number>
  markedGroupSet: Set<string>
  markedTabSet: Set<number>
  activeTabId: number | null
  trackedWindowId: number | undefined
  trackedWindowTitle: string | null
  showUrl: boolean
  setRowRef: (rowIndex: number, el: HTMLDivElement | null) => void
  isWindowExpanded: (windowId: number) => boolean
  isGroupExpanded: (windowId: number, groupId: number | null) => boolean
  variant: "default" | "groupNew"
  groupNewPhase: "tabs" | "meta"
  groupPanelRef: RefObject<HTMLDivElement | null>
  groupChoices: GroupChoice[]
  groupPickIndex: number
  newTabUrlWindowId: number | null
  groupMetaTitleRef: RefObject<HTMLInputElement | null>
  newTabUrl: string
  setNewTabUrl: Dispatch<SetStateAction<string>>
  editPanel: EditPanel | null
  actionMenuPanel: ActionMenuPanel | null
  actionMenuPanelRef: RefObject<HTMLDivElement | null>
  groupMetaColorStripRef: RefObject<HTMLDivElement | null>
  newGroupTitle: string
  setNewGroupTitle: Dispatch<SetStateAction<string>>
  newGroupColorIndex: number
  onMetaColorKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  editTitle: string
  setEditTitle: Dispatch<SetStateAction<string>>
  editPanelRef: RefObject<HTMLDivElement | null>
  searchMode: boolean
  filterQuery: string
  setFilterQuery: Dispatch<SetStateAction<string>>
  isHostPaneFocused: boolean
  inputRef: RefObject<HTMLTextAreaElement | null>
}
