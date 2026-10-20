import type { HistoryCacheEntry, PageTabCacheEntry } from "./types"

/** EN: Fresh when URL matches and cached data timestamp covers the live tab access time. */
export function isPageTabCacheEntryFresh(
  entry: PageTabCacheEntry | undefined,
  liveUrl: string,
  liveDataTimestamp: number
): boolean {
  if (entry === undefined) {
    return false
  }
  if (entry.url !== liveUrl) {
    return false
  }
  return entry.dataTimestamp >= liveDataTimestamp
}

/** EN: Fresh when URL matches and `lastVisitTime` is not older than live history. */
export function isHistoryCacheEntryFresh(
  cached: HistoryCacheEntry | undefined,
  liveUrl: string,
  liveLastVisitTime: number
): boolean {
  if (cached === undefined) {
    return false
  }
  if (cached.url !== liveUrl) {
    return false
  }
  return cached.lastVisitTime >= liveLastVisitTime
}
