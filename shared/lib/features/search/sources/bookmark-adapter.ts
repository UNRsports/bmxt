/**
 * EN: Flattens the bookmark tree; reuses storage when tree revision is unchanged.
 * JA: ブックマーク木を平坦化。revision 一致時は storage を再利用。
 */

import { linesForSearchElement, matchesNeedle, MAX_BOOKMARK_ROWS } from "../index"
import { resolveBookmarkEntriesForSearch } from "../cache/search-cache-store"
import { pollSearchCancel, type SearchShouldCancel } from "../cooperative-cancel"

export async function searchBookmarkLines(
  pattern: string,
  shouldCancel?: SearchShouldCancel
): Promise<string[]> {
  if (shouldCancel?.()) {
    return []
  }
  const flat = await resolveBookmarkEntriesForSearch()
  if (shouldCancel?.()) {
    return []
  }
  const matchAll = !pattern.trim()
  const matches: string[] = []
  let hitCount = 0
  for (let index = 0; index < flat.length; index += 1) {
    if (await pollSearchCancel(shouldCancel, index)) {
      return []
    }
    const b = flat[index]!
    if (b.isFolder) {
      continue
    }
    const blob = `${b.title} ${b.url}`
    if (!matchAll && !matchesNeedle(blob, pattern)) {
      continue
    }
    hitCount += 1
    const fields: Record<string, string> = {
      title: b.title || "(untitled)",
      url: b.url,
      bookmarkId: b.bookmarkId
    }
    if (b.parentId.length > 0) {
      fields.parentId = b.parentId
    }
    if (b.dateAdded > 0) {
      fields.dateAdded = String(b.dateAdded)
    }
    matches.push(...linesForSearchElement("bookmark", fields))
  }
  if (shouldCancel?.()) {
    return []
  }
  if (matches.length === 0) {
    return ["(no bookmark matches — pattern is case-insensitive substring, or empty pattern for all)"]
  }
  return [
    `(${hitCount} element(s) from bookmarks, scan capped at ${MAX_BOOKMARK_ROWS} nodes)`,
    ...matches
  ]
}
