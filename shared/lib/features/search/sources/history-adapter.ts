/**
 * EN: Reads chrome.history via in-memory cache when URL + lastVisitTime still match.
 * JA: URL と lastVisitTime が一致すればメモリキャッシュを再利用。
 */

import { resolveHistoryEntriesForSearch } from "../cache/search-cache-store.ts"
import { linesForSearchElement } from "../search-format.ts"
import { HISTORY_LOOKBACK_DAYS, MAX_HISTORY_RESULTS } from "../limits.ts"
import { matchesNeedle } from "../matcher.ts"
import { getRunLocale } from "../../setting/i18n/run-locale.ts"
import { tSearch } from "../../setting/i18n/ns/search.ts"

function historyCapNotices(options: {
  matchAll: boolean
  hitMaxResults: boolean
  maxResults: number
}): string[] {
  const locale = getRunLocale()
  const notices: string[] = []
  if (options.matchAll) {
    notices.push(
      tSearch("search.history.notice.browseCapped", locale, {
        days: String(HISTORY_LOOKBACK_DAYS),
        max: String(options.maxResults)
      })
    )
    return notices
  }
  if (options.hitMaxResults) {
    notices.push(
      tSearch("search.history.notice.patternCapped", locale, {
        max: String(options.maxResults)
      })
    )
  }
  return notices
}

export async function searchHistoryLines(pattern: string): Promise<string[]> {
  const resolved = await resolveHistoryEntriesForSearch(pattern)
  const matchAll = !pattern.trim()
  const matches: string[] = []
  let hitCount = 0
  for (const it of resolved.entries) {
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

  const notices = historyCapNotices({
    matchAll,
    hitMaxResults: resolved.hitMaxResults,
    maxResults: resolved.maxResults
  })

  if (matches.length === 0) {
    return [...notices, tSearch("search.history.notice.noMatches", getRunLocale())]
  }
  return [...notices, ...matches]
}

export { MAX_HISTORY_RESULTS }
