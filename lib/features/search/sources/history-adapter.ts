/**
 * EN: Reads chrome.history via `unlimitedStorage` cache when URL + lastVisitTime still match.
 * JA: URL と lastVisitTime が一致すれば storage キャッシュを再利用。
 */

import {
  linesForSearchElement,
  matchesNeedle,
  MAX_HISTORY_RESULTS
} from "../index"
import { resolveHistoryEntriesForSearch } from "../cache/search-cache-store"

export async function searchHistoryLines(pattern: string): Promise<string[]> {
  const items = await resolveHistoryEntriesForSearch()
  const matchAll = !pattern.trim()
  const matches: string[] = []
  let hitCount = 0
  for (const it of items) {
    const title = it.title ?? ""
    const url = it.url ?? ""
    const blob = `${title} ${url}`
    if (!matchAll && !matchesNeedle(blob, pattern)) {
      continue
    }
    hitCount += 1
    matches.push(
      ...linesForSearchElement("history", {
        title: title || "(no title)",
        url: url || "(no url)"
      })
    )
  }
  if (matches.length === 0) {
    return ["(no history matches — pattern is case-insensitive substring, or empty pattern for all)"]
  }
  return [
    `(${hitCount} element(s) from recent history, capped at ${MAX_HISTORY_RESULTS} rows)`,
    ...matches
  ]
}
