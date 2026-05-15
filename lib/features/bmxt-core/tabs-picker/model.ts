export type SelectKind = "window" | "group" | "tab"
export type BulkSubMode = "move" | "close" | "newTab" | "group" | "newWindow"

export type PickerState = {
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bulkSubMode: BulkSubMode | null
}

export type CurrentRow = {
  kind: SelectKind
  tabId?: number
  windowId?: number
  groupKey?: string
}

export type RangeSelectInput = {
  anchor: number
  target: number
  rows: CurrentRow[]
}

export type PickerEvent =
  | { kind: "moveHi"; delta: number; visibleLen: number }
  | { kind: "moveDest"; delta: number; visibleLen: number }
  | { kind: "cycleSubMode"; direction: number; implicitKind?: SelectKind }
  | { kind: "toggleCurrent"; row: CurrentRow }
  | { kind: "selectRange"; input: RangeSelectInput }
  | { kind: "clearMarked" }
