/** EN: Unified SQLite search cache — history/bookmark scopes; page text is live-only. */
export {
  flushSearchCacheDb,
  rebuildBookmarkSearchCache,
  removePageCacheTab,
  resolveBookmarkEntriesForSearch,
  resolveHistoryEntriesForSearch,
  upsertHistoryCacheOnVisit,
  warmSearchBookmarkCache,
  warmSearchHistoryCache,
  resetSearchCacheFromSettings
} from "./search-cache-store"

export { registerSearchCacheBackgroundListeners, warmSearchCachesOnStartup } from "./background-listeners"

export type { BookmarkCacheEntry, HistoryCacheEntry, PageTabCacheEntry } from "./types"
