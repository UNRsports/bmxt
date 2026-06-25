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

import type { NewGroupPaletteColor } from "./tab-picker-overlay-constants"

export type ActionMenuTabTarget = {
  tabId: number
  title: string
  url: string
  faviconSrc: string | null
  groupColor: NewGroupPaletteColor | null
}

export type ActionMenuPanel = {
  pickIndex: number
  targetKind: SelectKind
  tabTargets: ActionMenuTabTarget[]
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
