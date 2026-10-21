/** EN: Row shapes exposed by the unified search cache store. */

export const SEARCH_CACHE_SCHEMA_VERSION = 1 as const

export type HistoryCacheEntry = {
  url: string
  title: string
  /** `chrome.history.HistoryItem.lastVisitTime` */
  lastVisitTime: number
}

export type SearchHistoryCachePayload = {
  v: typeof SEARCH_CACHE_SCHEMA_VERSION
  lookbackMs: number
  maxResults: number
  entries: HistoryCacheEntry[]
  /** Max `lastVisitTime` across `entries` (probe shortcut). */
  maxLastVisitTime: number
  updatedAt: number
}

export type BookmarkCacheEntry = {
  title: string
  url: string
  dateAdded: number
}

export type SearchBookmarkCachePayload = {
  v: typeof SEARCH_CACHE_SCHEMA_VERSION
  entries: BookmarkCacheEntry[]
  /** Tree fingerprint — any node id/date change invalidates. */
  revision: string
  updatedAt: number
}

export type PageTabCacheEntry = {
  tabId: number
  url: string
  title: string
  windowId: number
  text: string | null
  /** Tab `lastAccessed` (or fetch time) when `text` was captured. */
  dataTimestamp: number
  fetchedAt: number
}

export type SearchPageCachePayload = {
  v: typeof SEARCH_CACHE_SCHEMA_VERSION
  byTabId: Record<string, PageTabCacheEntry>
  updatedAt: number
}
