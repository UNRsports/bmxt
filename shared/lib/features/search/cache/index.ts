/** EN: In-memory search cache — history/bookmark scopes; page text is live-only. */
export {
  ensureSearchCacheBackgroundListeners,
  flushSearchCacheDb,
  rebuildBookmarkSearchCache,
  removePageCacheTab,
  resolveBookmarkEntriesForSearch,
  resolveHistoryEntriesForSearch,
  type HistorySearchResolution,
  upsertHistoryCacheOnVisit
} from "./search-cache-store"

export type { BookmarkCacheEntry, HistoryCacheEntry, PageTabCacheEntry } from "./types"
