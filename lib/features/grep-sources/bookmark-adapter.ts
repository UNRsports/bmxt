/**
 * EN: Flattens the bookmark tree in memory only; no persistence.
 * JA: ブックマーク木をメモリ上のみ平坦化。永続化しません。
 */

import { formatGrepLine, matchesNeedle, MAX_BOOKMARK_ROWS } from "../search"

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

export async function grepBookmarkLines(pattern: string): Promise<string[]> {
  const tree = await chrome.bookmarks.getTree()
  const flat: { title: string; url: string }[] = []
  walkBookmarks(tree, flat)
  const matches: string[] = []
  for (const b of flat) {
    const blob = `${b.title} ${b.url}`
    if (!matchesNeedle(blob, pattern)) {
      continue
    }
    matches.push(formatGrepLine("bookmark", b.url, b.title || "(untitled)"))
  }
  if (matches.length === 0) {
    return ["(no bookmark matches — pattern is case-insensitive substring)"]
  }
  return [
    `(${matches.length} match(es) from bookmarks, scan capped at ${MAX_BOOKMARK_ROWS} nodes)`,
    ...matches
  ]
}
