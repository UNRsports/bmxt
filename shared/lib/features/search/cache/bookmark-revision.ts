import { MAX_BOOKMARK_ROWS } from "../limits.ts"
import type { BookmarkCacheEntry } from "./types.ts"

function walkBookmarkTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  revisionParts: string[],
  flat: BookmarkCacheEntry[],
  maxRows: number
): void {
  for (const n of nodes) {
    revisionParts.push(`${n.id}:${n.dateAdded ?? 0}:${n.dateGroupModified ?? 0}`)
    const parentId = typeof n.parentId === "string" ? n.parentId : ""
    const title = n.title ?? ""
    const dateAdded = n.dateAdded ?? 0
    if (n.url) {
      revisionParts.push(`u:${n.url.length}`)
      if (flat.length < maxRows) {
        flat.push({
          bookmarkId: n.id,
          parentId,
          title,
          url: n.url,
          dateAdded,
          isFolder: false
        })
      }
    } else if (n.children !== undefined) {
      if (flat.length < maxRows) {
        flat.push({
          bookmarkId: n.id,
          parentId,
          title,
          url: "",
          dateAdded,
          isFolder: true
        })
      }
      walkBookmarkTree(n.children, revisionParts, flat, maxRows)
    }
  }
}

/** EN: Fingerprint the bookmark tree — any structural or date change invalidates cache. */
export function bookmarkTreeRevision(tree: chrome.bookmarks.BookmarkTreeNode[]): string {
  const parts: string[] = []
  walkBookmarkTree(tree, parts, [], MAX_BOOKMARK_ROWS)
  return parts.join("|")
}

/** EN: One pass — revision string + capped flat bookmark rows (urls + folders). */
export function flattenBookmarkTreeWithRevision(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  maxRows: number
): { revision: string; entries: BookmarkCacheEntry[] } {
  const revisionParts: string[] = []
  const entries: BookmarkCacheEntry[] = []
  walkBookmarkTree(tree, revisionParts, entries, maxRows)
  return { revision: revisionParts.join("|"), entries }
}
