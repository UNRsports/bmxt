/**
 * EN: Pure bookmark picker row builder (no i18n / chrome imports; unit-testable under plain node).
 * JA: ブックマークピッカー行の純粋ビルダー（i18n・chrome 依存なし）。
 */

import type { BookmarkCacheEntry } from "../search/cache/types.ts"

export type BookmarkPickerRow =
  | {
      kind: "folder"
      bookmarkId: string
      parentId: string
      title: string
      label: string
      depth: number
    }
  | {
      kind: "item"
      bookmarkId: string
      parentId: string
      title: string
      url: string
      dateAdded: number
      depth: number
    }

export type BookmarkPickerRowsBuildOptions = {
  /** EN: When set, emit only this folder and its descendants. */
  folderId?: string | null
  /** EN: Folder label formatter (display truncation / localisation). */
  formatFolderLabel: (title: string) => string
}

function compareEntries(a: BookmarkCacheEntry, b: BookmarkCacheEntry): number {
  if (a.isFolder !== b.isFolder) {
    return a.isFolder ? -1 : 1
  }
  const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  if (titleCmp !== 0) {
    return titleCmp
  }
  return a.bookmarkId.localeCompare(b.bookmarkId)
}

function childrenOf(
  byParent: Map<string, BookmarkCacheEntry[]>,
  parentId: string
): BookmarkCacheEntry[] {
  const kids = byParent.get(parentId)
  if (kids === undefined) {
    return []
  }
  return [...kids].sort(compareEntries)
}

function walkSubtree(
  byParent: Map<string, BookmarkCacheEntry[]>,
  parentId: string,
  depth: number,
  formatFolderLabel: (title: string) => string,
  out: BookmarkPickerRow[]
): void {
  for (const entry of childrenOf(byParent, parentId)) {
    if (entry.isFolder) {
      const title = entry.title.trim().length > 0 ? entry.title : "(folder)"
      out.push({
        kind: "folder",
        bookmarkId: entry.bookmarkId,
        parentId: entry.parentId,
        title,
        label: formatFolderLabel(title),
        depth
      })
      walkSubtree(byParent, entry.bookmarkId, depth + 1, formatFolderLabel, out)
      continue
    }
    const title =
      entry.title.trim().length > 0
        ? entry.title
        : entry.url.trim().length > 0
          ? entry.url
          : "(untitled)"
    out.push({
      kind: "item",
      bookmarkId: entry.bookmarkId,
      parentId: entry.parentId,
      title,
      url: entry.url,
      dateAdded: entry.dateAdded,
      depth
    })
  }
}

/**
 * EN: Build preorder folder/item rows from the bookmark cache (N-level tree).
 * JA: ブックマークキャッシュからフォルダ／項目の preorder 行を組み立てる。
 */
export function buildBookmarkPickerRowsFromEntriesWith(
  entries: readonly BookmarkCacheEntry[],
  options: BookmarkPickerRowsBuildOptions
): BookmarkPickerRow[] {
  const formatFolderLabel = options.formatFolderLabel
  const folderId = options.folderId ?? null

  const byParent = new Map<string, BookmarkCacheEntry[]>()
  const byId = new Map<string, BookmarkCacheEntry>()
  for (const entry of entries) {
    byId.set(entry.bookmarkId, entry)
    const parentKey = entry.parentId
    const bucket = byParent.get(parentKey)
    if (bucket === undefined) {
      byParent.set(parentKey, [entry])
    } else {
      bucket.push(entry)
    }
  }

  const out: BookmarkPickerRow[] = []

  if (folderId !== null && folderId.length > 0) {
    const root = byId.get(folderId)
    if (root === undefined || !root.isFolder) {
      return out
    }
    const title = root.title.trim().length > 0 ? root.title : "(folder)"
    out.push({
      kind: "folder",
      bookmarkId: root.bookmarkId,
      parentId: root.parentId,
      title,
      label: formatFolderLabel(title),
      depth: 0
    })
    walkSubtree(byParent, root.bookmarkId, 1, formatFolderLabel, out)
    return out
  }

  // EN: Roots are entries whose parent is missing from the tree (Chrome root nodes).
  const rootIds: string[] = []
  for (const entry of entries) {
    if (!entry.isFolder) {
      continue
    }
    if (!byId.has(entry.parentId) || entry.parentId.length === 0) {
      rootIds.push(entry.bookmarkId)
    }
  }
  rootIds.sort((a, b) => {
    const ea = byId.get(a)
    const eb = byId.get(b)
    if (ea === undefined || eb === undefined) {
      return a.localeCompare(b)
    }
    return compareEntries(ea, eb)
  })

  for (const rootId of rootIds) {
    const root = byId.get(rootId)
    if (root === undefined) {
      continue
    }
    const title = root.title.trim().length > 0 ? root.title : "(folder)"
    out.push({
      kind: "folder",
      bookmarkId: root.bookmarkId,
      parentId: root.parentId,
      title,
      label: formatFolderLabel(title),
      depth: 0
    })
    walkSubtree(byParent, root.bookmarkId, 1, formatFolderLabel, out)
  }

  return out
}
