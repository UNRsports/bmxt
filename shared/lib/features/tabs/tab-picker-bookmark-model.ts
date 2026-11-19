/**
 * EN: Pure helpers for the tab-picker "add to bookmarks" flow (no React, no chrome.*).
 * JA: タブピッカーの「ブックマークに追加」フロー用の純粋関数（React / chrome.* 非依存）。
 */

import type { BookmarkFolderChoice } from "../bookmark/folders.ts"
import { parseOpenHttpUrl } from "../url/parse-open-http-url.ts"
import type {
  ActionMenuTabTarget,
  BookmarkFolderOption,
  BookmarkItemDraft,
  BookmarkPanel,
  BookmarkPanelMode
} from "./tab-picker-overlay-types.ts"

/** EN: Same cap as the `bookmark_create` effect. */
export const MAX_BOOKMARK_TITLE_LENGTH = 512

/** EN: Upper bound for a single URL string typed or taken from a tab (input length validation). */
export const MAX_BOOKMARK_URL_LENGTH = 8192

/** EN: Chrome "Bookmarks bar" folder id; used as the default pick when present. */
const BOOKMARKS_BAR_FOLDER_ID = "1"

/** EN: Separator used when rendering a folder path label. */
const FOLDER_PATH_SEPARATOR = " / "

/** EN: Max parent hops when building a path label (cycle guard). */
const MAX_FOLDER_PATH_DEPTH = 32

export type ValidatedBookmarkItem = {
  tabId: number
  title: string
  url: string
}

export type BookmarkItemValidationFailure = {
  index: number
  reason: "invalidUrl" | "urlTooLong"
  /** EN: Raw URL as typed (truncated for display by the caller). */
  url: string
}

export type BookmarkItemsValidation =
  | { ok: true; items: ValidatedBookmarkItem[] }
  | { ok: false; failure: BookmarkItemValidationFailure }

/** EN: Title to store: trimmed, capped at 512, falls back to the URL when empty. */
export function normalizeBookmarkTitle(rawTitle: string, url: string): string {
  const trimmed = rawTitle.trim().slice(0, MAX_BOOKMARK_TITLE_LENGTH)
  if (trimmed.length > 0) {
    return trimmed
  }
  return url.slice(0, MAX_BOOKMARK_TITLE_LENGTH)
}

/** EN: Validate a new folder name; returns the trimmed name or null when invalid. */
export function validateNewBookmarkFolderName(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_BOOKMARK_TITLE_LENGTH) {
    return null
  }
  return trimmed
}

/** EN: http(s) URL normalized via `URL`, or null when empty / too long / not http(s). */
export function parseBookmarkUrl(raw: string): string | null {
  if (raw.length > MAX_BOOKMARK_URL_LENGTH) {
    return null
  }
  return parseOpenHttpUrl(raw)
}

/**
 * EN: Build editable drafts from picker targets. Multi mode drops tabs whose URL is not
 * http(s); single mode keeps the tab so the user can fix the URL by hand.
 */
export function buildBookmarkDrafts(
  targets: readonly ActionMenuTabTarget[],
  mode: BookmarkPanelMode
): { items: BookmarkItemDraft[]; skippedInvalidCount: number } {
  const items: BookmarkItemDraft[] = []
  let skippedInvalidCount = 0
  for (const target of targets) {
    const draft: BookmarkItemDraft = {
      tabId: target.tabId,
      title: target.title,
      url: target.url
    }
    if (mode === "multi" && parseBookmarkUrl(target.url) === null) {
      skippedInvalidCount += 1
      continue
    }
    items.push(draft)
  }
  return { items, skippedInvalidCount }
}

/**
 * EN: Folder options for the pick list. Hides the invisible root (no parent), labels each
 * folder with its full path, and sorts by label.
 */
export function buildBookmarkFolderOptions(
  folders: readonly BookmarkFolderChoice[],
  unnamedLabel: (id: string) => string
): BookmarkFolderOption[] {
  const byId = new Map<string, BookmarkFolderChoice>()
  for (const folder of folders) {
    byId.set(folder.id, folder)
  }

  const options: BookmarkFolderOption[] = []
  for (const folder of folders) {
    if (folder.parentId.length === 0) {
      continue
    }
    const segments: string[] = []
    let current: BookmarkFolderChoice | undefined = folder
    let depth = 0
    while (current !== undefined && current.parentId.length > 0 && depth < MAX_FOLDER_PATH_DEPTH) {
      const name = current.title.trim()
      segments.unshift(name.length > 0 ? name : unnamedLabel(current.id))
      current = byId.get(current.parentId)
      depth += 1
    }
    options.push({ id: folder.id, label: segments.join(FOLDER_PATH_SEPARATOR) })
  }

  options.sort((a, b) => {
    const labelCmp = a.label.localeCompare(b.label)
    if (labelCmp !== 0) {
      return labelCmp
    }
    return a.id.localeCompare(b.id)
  })
  return options
}

/** EN: Index of the Bookmarks bar folder when present, else 0. */
export function defaultBookmarkFolderIndex(folders: readonly BookmarkFolderOption[]): number {
  const idx = folders.findIndex((f) => f.id === BOOKMARKS_BAR_FOLDER_ID)
  return idx >= 0 ? idx : 0
}

/** EN: Number of selectable rows in the folder list (multi adds the "new folder" row). */
export function bookmarkFolderRowCount(panel: BookmarkPanel): number {
  return panel.mode === "multi" ? panel.folders.length + 1 : panel.folders.length
}

/** EN: True when the multi-mode "new folder" row is highlighted. */
export function isNewBookmarkFolderSelected(panel: BookmarkPanel): boolean {
  return panel.mode === "multi" && panel.folderPickIndex === 0
}

/** EN: Existing folder under the cursor, or null (new-folder row / out of range). */
export function selectedBookmarkFolder(panel: BookmarkPanel): BookmarkFolderOption | null {
  const folderIndex = panel.mode === "multi" ? panel.folderPickIndex - 1 : panel.folderPickIndex
  if (folderIndex < 0) {
    return null
  }
  return panel.folders[folderIndex] ?? null
}

/** EN: Validate and normalize every draft; stops at the first invalid URL. */
export function validateBookmarkItems(
  items: readonly BookmarkItemDraft[]
): BookmarkItemsValidation {
  const validated: ValidatedBookmarkItem[] = []
  for (let index = 0; index < items.length; index += 1) {
    const draft = items[index]
    if (draft === undefined) {
      continue
    }
    if (draft.url.length > MAX_BOOKMARK_URL_LENGTH) {
      return { ok: false, failure: { index, reason: "urlTooLong", url: draft.url } }
    }
    const url = parseOpenHttpUrl(draft.url)
    if (url === null) {
      return { ok: false, failure: { index, reason: "invalidUrl", url: draft.url } }
    }
    validated.push({
      tabId: draft.tabId,
      title: normalizeBookmarkTitle(draft.title, url),
      url
    })
  }
  return { ok: true, items: validated }
}

/** EN: Next index when moving through `count` rows with wrap-around. */
export function wrapIndex(current: number, delta: number, count: number): number {
  if (count <= 0) {
    return 0
  }
  return (((current + delta) % count) + count) % count
}
