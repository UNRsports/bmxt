/** EN: Pure `/` search-time visibility for bookmark tree (tabs-compatible). */

import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle.ts"
import {
  expandBookmarkFolder,
  isBookmarkFolderExpanded
} from "./fold-state.ts"
import type { BookmarkPickerRow } from "./picker-rows.ts"

function bookmarkItemMatches(
  row: BookmarkPickerRow & { kind: "item" },
  byUrl: boolean,
  lcNeedle: string
): boolean {
  if (byUrl) {
    return row.url.toLowerCase().includes(lcNeedle)
  }
  return row.title.toLowerCase().includes(lcNeedle)
}

function bookmarkFolderMatches(
  row: BookmarkPickerRow & { kind: "folder" },
  byUrl: boolean,
  lcNeedle: string
): boolean {
  if (byUrl) {
    return false
  }
  return (
    row.label.toLowerCase().includes(lcNeedle) || row.title.toLowerCase().includes(lcNeedle)
  )
}

/**
 * EN: During `/` input — virtually expand matching folder trees; hide non-matches.
 * `fallbackVisible` is used when the needle is empty (fold-based visibility).
 */
export function computeBookmarkSearchFilteredVisibleIndices(
  rows: readonly BookmarkPickerRow[],
  filterQuery: string,
  fallbackVisible: readonly number[]
): number[] {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)
  if (needle === "") {
    return [...fallbackVisible]
  }
  const lc = needle.toLowerCase()

  const indexByFolderId = new Map<string, number>()
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    if (row.kind === "folder") {
      indexByFolderId.set(row.bookmarkId, i)
    }
  }

  const include = new Set<number>()

  const addAncestors = (parentId: string): void => {
    let id = parentId
    const seen = new Set<string>()
    while (id.length > 0 && !seen.has(id)) {
      seen.add(id)
      const folderIndex = indexByFolderId.get(id)
      if (folderIndex === undefined) {
        break
      }
      include.add(folderIndex)
      const folder = rows[folderIndex]
      if (folder === undefined || folder.kind !== "folder") {
        break
      }
      id = folder.parentId
    }
  }

  const addDescendants = (folderIndex: number): void => {
    const folder = rows[folderIndex]
    if (folder === undefined || folder.kind !== "folder") {
      return
    }
    const baseDepth = folder.depth
    for (let j = folderIndex + 1; j < rows.length; j += 1) {
      const child = rows[j]!
      if (child.depth <= baseDepth) {
        break
      }
      include.add(j)
    }
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    if (row.kind === "folder") {
      if (bookmarkFolderMatches(row, byUrl, lc)) {
        include.add(i)
        addAncestors(row.parentId)
        addDescendants(i)
      }
      continue
    }
    if (bookmarkItemMatches(row, byUrl, lc)) {
      include.add(i)
      addAncestors(row.parentId)
    }
  }

  const out: number[] = []
  for (let i = 0; i < rows.length; i += 1) {
    if (include.has(i)) {
      out.push(i)
    }
  }
  return out
}

/**
 * EN: After `/` Enter — permanently expand folders on the match path.
 * @returns true when fold state changed (caller should bump foldRevision).
 */
export function expandBookmarkFoldsForSearchMatches(
  rows: readonly BookmarkPickerRow[],
  pattern: string
): boolean {
  const { needle } = parsePickerSearchNeedle(pattern)
  if (needle === "") {
    return false
  }
  const visible = computeBookmarkSearchFilteredVisibleIndices(rows, pattern, [])
  let changed = false
  for (const index of visible) {
    const row = rows[index]
    if (row === undefined || row.kind !== "folder") {
      continue
    }
    if (!isBookmarkFolderExpanded(row.bookmarkId)) {
      expandBookmarkFolder(row.bookmarkId)
      changed = true
    }
  }
  return changed
}
