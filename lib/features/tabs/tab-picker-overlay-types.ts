export type BulkSubMode = "move" | "close" | "newTab" | "group" | "newWindow" | "edit"
export type SelectKind = "window" | "group" | "tab"

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
