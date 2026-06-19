/**
 * EN: Flattens the bookmark tree; reuses storage when tree revision is unchanged.
 * JA: ブックマーク木を平坦化。revision 一致時は storage を再利用。
 */

import { linesForSearchElement, matchesNeedle, MAX_BOOKMARK_ROWS } from "../index"
import { resolveBookmarkEntriesForSearch } from "../cache/search-cache-store"

export async function searchBookmarkLines(pattern: string): Promise<string[]> {
  const flat = await resolveBookmarkEntriesForSearch()
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
      ...linesForSearchElement("bookmark", {
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
