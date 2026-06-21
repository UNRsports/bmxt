export type BulkSubMode =
  | "move"
  | "close"
  | "newTab"
  | "group"
  | "newWindow"
  | "edit"
  | "reload"

export type SelectKind = "window" | "group" | "tab"

export type ActionMenuItemId =
  | "move"
  | "close"
  | "group"
  | "newWindow"
  | "newTab"
  | "edit"
  | "reload"

export type ActionMenuPanel = {
  pickIndex: number
  targetKind: SelectKind
  tabLabels: string[]
}

export type GroupEditMenuActionId = "rename" | "ungroup" | "deleteGroup"

export type EditPanel =
  | { kind: "windowRename"; windowId: number }
  | {
      kind: "groupMenu"
      windowId: number
      groupId: number
      groupKey: string
      pickIndex: number
    }
  | { kind: "groupRename"; windowId: number; groupId: number; groupKey: string }

export type GroupChoice = {
  id: number
  windowId: number
  label: string
}
