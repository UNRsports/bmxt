/** EN: N-level folder fold for bookmark picker (collapsed folder ids). */

import type { BookmarkPickerRow } from "./picker-rows.ts"

export type BookmarkFoldSnapshot = {
  collapsedFolderIds: string[]
}

const collapsedFolderIds = new Set<string>()

export function isBookmarkFolderExpanded(folderId: string): boolean {
  return !collapsedFolderIds.has(folderId)
}

export function toggleBookmarkFolderFold(folderId: string): boolean {
  if (collapsedFolderIds.has(folderId)) {
    collapsedFolderIds.delete(folderId)
    return true
  }
  collapsedFolderIds.add(folderId)
  return false
}

export function expandBookmarkFolder(folderId: string): void {
  collapsedFolderIds.delete(folderId)
}

export function collapseBookmarkFolder(folderId: string): void {
  collapsedFolderIds.add(folderId)
}

export function resetBookmarkFoldState(): void {
  collapsedFolderIds.clear()
}

/**
 * EN: A row is visible when every ancestor folder on the path is expanded.
 * JA: 祖先フォルダがすべて展開されている行だけを表示する。
 */
export function computeBookmarkVisibleRowIndices(rows: readonly BookmarkPickerRow[]): number[] {
  const visible: number[] = []
  const ancestorStack: string[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    while (ancestorStack.length > row.depth) {
      ancestorStack.pop()
    }

    let ancestorsExpanded = true
    for (const ancestorId of ancestorStack) {
      if (collapsedFolderIds.has(ancestorId)) {
        ancestorsExpanded = false
        break
      }
    }
    if (!ancestorsExpanded) {
      continue
    }

    visible.push(i)
    if (row.kind === "folder") {
      ancestorStack.push(row.bookmarkId)
    }
  }
  return visible
}
