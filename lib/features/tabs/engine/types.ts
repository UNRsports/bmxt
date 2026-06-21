import type { TabPickerRow } from "../picker-rows"
import type {
  ActionMenuPanel,
  BulkSubMode,
  EditPanel,
  GroupChoice,
  SelectKind
} from "../tab-picker-overlay-types"
import type { PickerReducerEvent } from "../state-machine"

/** EN: Full tab picker runtime state — single source of truth for one session leaf. */
export type TabPickerEngineState = {
  rows: TabPickerRow[]
  showUrl: boolean
  variant: "default" | "groupNew"
  initialHi: number
  anchorTabId: number | null
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bulkSubMode: BulkSubMode | null
  filterQuery: string
  searchMode: boolean
  hlSearchPattern: string
  commandMode: boolean
  commandBuffer: string
  commandListingHint: boolean
  activeTabId: number | null
  groupChoices: GroupChoice[]
  groupPickIndex: number
  groupNewPhase: "tabs" | "meta"
  newGroupTitle: string
  newGroupColorIndex: number
  newTabUrlWindowId: number | null
  newTabUrl: string
  editPanel: EditPanel | null
  editTitle: string
  actionMenuPanel: ActionMenuPanel | null
}

export type TabPickerEngineAction =
  | { type: "rowsRebuilt"; rows: TabPickerRow[] }
  | { type: "reducer"; event: PickerReducerEvent; visibleLen: number }
  | { type: "reducerSequence"; events: PickerReducerEvent[]; visibleLen: number }
  | { type: "update"; updater: (prev: TabPickerEngineState) => TabPickerEngineState }

export type TabPickerEngineDispatch = (action: TabPickerEngineAction) => void

export type TabPickerEngineStore = {
  readonly sessionId: string
  getState(): TabPickerEngineState
  subscribe(listener: () => void): () => void
  dispatch: TabPickerEngineDispatch
}
