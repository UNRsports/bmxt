/**
 * EN: Flattens the bookmark tree in memory only; no persistence.
 * JA: ブックマーク木をメモリ上のみ平坦化。永続化しません。
 */

import { linesForFindElement, matchesNeedle, MAX_BOOKMARK_ROWS } from "../search"

function walkBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  out: { title: string; url: string }[]
): void {
  for (const n of nodes) {
    if (n.url) {
      out.push({ title: n.title ?? "", url: n.url })
      if (out.length >= MAX_BOOKMARK_ROWS) {
        return
      }
    }
    if (n.children?.length) {
      walkBookmarks(n.children, out)
      if (out.length >= MAX_BOOKMARK_ROWS) {
        return
      }
    }
  }
}

export async function findBookmarkLines(pattern: string): Promise<string[]> {
  const tree = await chrome.bookmarks.getTree()
  const flat: { title: string; url: string }[] = []
  walkBookmarks(tree, flat)
  const matchAll = !pattern.trim()
  const matches: string[] = []
  let hitCount = 0
  for (const b of flat) {
    const blob = `${b.title} ${b.url}`
    if (!matchAll && !matchesNeedle(blob, pattern)) {
      continue
    }
    hitCount += 1
    matches.push(
      ...linesForFindElement("bookmark", {
        title: b.title || "(untitled)",
        url: b.url
      })
    )
  }
  if (matches.length === 0) {
    return ["(no bookmark matches — pattern is case-insensitive substring, or empty pattern for all)"]
  }
  return [
    `(${hitCount} element(s) from bookmarks, scan capped at ${MAX_BOOKMARK_ROWS} nodes)`,
    ...matches
  ]
}
