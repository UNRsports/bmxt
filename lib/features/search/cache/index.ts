/** EN: Unified SQLite search cache — single source for all scopes. */
export {
  flushSearchCacheDb,
  prefetchPageTabInnerTextIfStale,
  rebuildBookmarkSearchCache,
  removePageCacheTab,
  resolveBookmarkEntriesForSearch,
  resolveHistoryEntriesForSearch,
  resolvePageInnerTextByOpenTab,
  resolvePageTabInnerText,
  tabDataTimestamp,
  upsertHistoryCacheOnVisit,
  warmSearchBookmarkCache,
  warmSearchHistoryCache,
  resetSearchCacheFromSettings
} from "./search-cache-store"

export { registerSearchCacheBackgroundListeners, warmSearchCachesOnStartup } from "./background-listeners"

export type { BookmarkCacheEntry, HistoryCacheEntry, PageTabCacheEntry } from "./types"
