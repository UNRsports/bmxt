import type { BookmarkCacheEntry } from "./types"

function walkBookmarkTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  revisionParts: string[],
  flat: BookmarkCacheEntry[],
  maxRows: number
): void {
  for (const n of nodes) {
    revisionParts.push(`${n.id}:${n.dateAdded ?? 0}:${n.dateGroupModified ?? 0}`)
    if (n.url) {
      revisionParts.push(`u:${n.url.length}`)
      if (flat.length < maxRows) {
        flat.push({
          title: n.title ?? "",
          url: n.url,
          dateAdded: n.dateAdded ?? 0
        })
      }
    }
    if (n.children?.length) {
      walkBookmarkTree(n.children, revisionParts, flat, maxRows)
    }
  }
}

/** EN: Fingerprint the bookmark tree — any structural or date change invalidates cache. */
export function bookmarkTreeRevision(tree: chrome.bookmarks.BookmarkTreeNode[]): string {
  const parts: string[] = []
  walkBookmarkTree(tree, parts, [], Number.MAX_SAFE_INTEGER)
  return parts.join("|")
}

/** EN: One pass — revision string + capped flat bookmark rows. */
export function flattenBookmarkTreeWithRevision(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  maxRows: number
): { revision: string; entries: BookmarkCacheEntry[] } {
  const revisionParts: string[] = []
  const entries: BookmarkCacheEntry[] = []
  walkBookmarkTree(tree, revisionParts, entries, maxRows)
  return { revision: revisionParts.join("|"), entries }
}
