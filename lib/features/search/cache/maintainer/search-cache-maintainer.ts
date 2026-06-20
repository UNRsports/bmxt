import { HISTORY_LOOKBACK_MS, MAX_HISTORY_RESULTS } from "../../limits"
import { runSearchCacheTaskAndPersist, type SearchCacheDbSession } from "../db/search-cache-db"
import {
  META_HISTORY_LOOKBACK_MS,
  META_HISTORY_MAX_RESULTS
} from "../db/schema"
import { rebuildBookmarkSearchCache, warmSearchHistoryCache } from "../search-cache-store"
import type { HistoryCacheEntry } from "../types"

const HISTORY_FLUSH_DEBOUNCE_MS = 2000
const BOOKMARK_REBUILD_DEBOUNCE_MS = 2000
const PAGE_TAB_FLUSH_DEBOUNCE_MS = 500
const WARM_DEFER_MS = 5000

const pendingHistory = new Map<string, HistoryCacheEntry>()
const pendingPageTabRemovals = new Set<number>()

let historyFlushTimer: ReturnType<typeof setTimeout> | undefined
let bookmarkRebuildTimer: ReturnType<typeof setTimeout> | undefined
let pageTabFlushTimer: ReturnType<typeof setTimeout> | undefined
let warmScheduled = false

function historyConfigMatches(session: SearchCacheDbSession): boolean {
  return (
    session.getMetaNumber(META_HISTORY_LOOKBACK_MS, -1) === HISTORY_LOOKBACK_MS &&
    session.getMetaNumber(META_HISTORY_MAX_RESULTS, -1) === MAX_HISTORY_RESULTS
  )
}

function syncHistoryConfigMeta(session: SearchCacheDbSession): void {
  session.setMeta(META_HISTORY_LOOKBACK_MS, String(HISTORY_LOOKBACK_MS))
  session.setMeta(META_HISTORY_MAX_RESULTS, String(MAX_HISTORY_RESULTS))
  session.recomputeHistoryMaxLastVisit()
}

export function queueHistoryCacheVisit(row: HistoryCacheEntry): void {
  const existing = pendingHistory.get(row.url)
  if (!existing || row.lastVisitTime >= existing.lastVisitTime) {
    pendingHistory.set(row.url, row)
  }
}

export function scheduleHistoryCacheFlush(): void {
  if (historyFlushTimer !== undefined) {
    clearTimeout(historyFlushTimer)
  }
  historyFlushTimer = setTimeout(() => {
    historyFlushTimer = undefined
    void flushPendingHistoryCacheWrites()
  }, HISTORY_FLUSH_DEBOUNCE_MS)
}

export async function flushPendingHistoryCacheWrites(): Promise<void> {
  if (pendingHistory.size === 0) {
    return
  }
  const batch = [...pendingHistory.values()]
  pendingHistory.clear()
  await runSearchCacheTaskAndPersist(async (session) => {
    for (const row of batch) {
      const existing = session.getHistoryRow(row.url)
      if (existing && existing.lastVisitTime >= row.lastVisitTime) {
        continue
      }
      if (!historyConfigMatches(session)) {
        syncHistoryConfigMeta(session)
      }
      session.upsertHistoryRow(row.url, row.title, row.lastVisitTime)
    }
    session.trimHistoryRows(MAX_HISTORY_RESULTS)
    syncHistoryConfigMeta(session)
  })
}

export function scheduleBookmarkCacheRebuild(): void {
  if (bookmarkRebuildTimer !== undefined) {
    clearTimeout(bookmarkRebuildTimer)
  }
  bookmarkRebuildTimer = setTimeout(() => {
    bookmarkRebuildTimer = undefined
    void rebuildBookmarkSearchCache()
  }, BOOKMARK_REBUILD_DEBOUNCE_MS)
}

export function queuePageCacheTabRemoval(tabId: number): void {
  pendingPageTabRemovals.add(tabId)
}

export function schedulePageCacheFlush(): void {
  if (pageTabFlushTimer !== undefined) {
    clearTimeout(pageTabFlushTimer)
  }
  pageTabFlushTimer = setTimeout(() => {
    pageTabFlushTimer = undefined
    void flushPendingPageCacheRemovals()
  }, PAGE_TAB_FLUSH_DEBOUNCE_MS)
}

export async function flushPendingPageCacheRemovals(): Promise<void> {
  if (pendingPageTabRemovals.size === 0) {
    return
  }
  const ids = [...pendingPageTabRemovals]
  pendingPageTabRemovals.clear()
  await runSearchCacheTaskAndPersist(async (session) => {
    for (const tabId of ids) {
      session.deletePageTab(tabId)
    }
  })
}

/** EN: Defer initial warm so SW command dispatch is not blocked at startup. */
export function scheduleDeferredSearchCacheWarm(): void {
  if (warmScheduled) {
    return
  }
  warmScheduled = true
  setTimeout(() => {
    void warmSearchHistoryCache().catch(() => {})
    void rebuildBookmarkSearchCache().catch(() => {})
  }, WARM_DEFER_MS)
}
