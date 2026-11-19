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
  | "snapshot"
  | "bookmark"

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

/** EN: Bookmark add flow phases (tab picker). JA: ブックマーク追加フローのフェーズ。 */
export type BookmarkPanelPhase = "folderPick" | "newFolder" | "itemEdit" | "dupConfirm"

/** EN: `single` = one tab (title/URL/folder form). `multi` = several tabs (folder pick + titles). */
export type BookmarkPanelMode = "single" | "multi"

export type BookmarkItemDraft = {
  tabId: number
  title: string
  url: string
}

export type BookmarkFolderOption = {
  /** EN: chrome.bookmarks folder id. */
  id: string
  /** EN: Display path such as `Bookmarks bar / Work`. */
  label: string
}

/**
 * EN: Bookmark add panel state (engine-owned, not a BulkSubMode).
 * `folderPickIndex`: single → index into `folders`; multi → 0 is the "new folder" row,
 * `n >= 1` maps to `folders[n - 1]`.
 */
export type BookmarkPanel = {
  mode: BookmarkPanelMode
  phase: BookmarkPanelPhase
  items: BookmarkItemDraft[]
  /** EN: Tabs dropped at open time because their URL is not http(s) (multi mode only). */
  skippedInvalidCount: number
  folders: BookmarkFolderOption[]
  foldersLoaded: boolean
  folderPickIndex: number
  newFolderName: string
  duplicateUrls: string[]
  /** EN: Already-localized message shown inside the panel, or null. */
  errorMessage: string | null
  submitting: boolean
}
