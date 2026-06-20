import { HISTORY_LOOKBACK_MS, MAX_HISTORY_RESULTS } from "../../limits"
import { runSearchCacheTask, scheduleSearchCachePersist, type SearchCacheDbSession } from "../db/search-cache-db"
import {
  META_HISTORY_LOOKBACK_MS,
  META_HISTORY_MAX_RESULTS
} from "../db/schema"
import { rebuildBookmarkSearchCache, warmSearchHistoryCache } from "../search-cache-store"
import type { HistoryCacheEntry } from "../types"

const pendingHistory = new Map<string, HistoryCacheEntry>()
const pendingPageTabRemovals = new Set<number>()

let historyMicrotaskQueued = false
let pageTabMicrotaskQueued = false
let bookmarkMicrotaskQueued = false
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

/** EN: Coalesce same-tick visits, apply to in-memory SQLite immediately, persist debounced. */
export function queueHistoryCacheVisit(row: HistoryCacheEntry): void {
  const existing = pendingHistory.get(row.url)
  if (!existing || row.lastVisitTime >= existing.lastVisitTime) {
    pendingHistory.set(row.url, row)
  }
  if (historyMicrotaskQueued) {
    return
  }
  historyMicrotaskQueued = true
  queueMicrotask(() => {
    historyMicrotaskQueued = false
    void flushPendingHistoryCacheWrites()
  })
}

export async function flushPendingHistoryCacheWrites(): Promise<void> {
  if (pendingHistory.size === 0) {
    return
  }
  const batch = [...pendingHistory.values()]
  pendingHistory.clear()
  await runSearchCacheTask(async (session) => {
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
  scheduleSearchCachePersist()
}

/** EN: Coalesce burst bookmark events; rebuild in-memory immediately, persist debounced. */
export function scheduleBookmarkCacheRebuild(): void {
  if (bookmarkMicrotaskQueued) {
    return
  }
  bookmarkMicrotaskQueued = true
  queueMicrotask(() => {
    bookmarkMicrotaskQueued = false
    void rebuildBookmarkSearchCache()
  })
}

export function queuePageCacheTabRemoval(tabId: number): void {
  pendingPageTabRemovals.add(tabId)
  if (pageTabMicrotaskQueued) {
    return
  }
  pageTabMicrotaskQueued = true
  queueMicrotask(() => {
    pageTabMicrotaskQueued = false
    void flushPendingPageCacheRemovals()
  })
}

export async function flushPendingPageCacheRemovals(): Promise<void> {
  if (pendingPageTabRemovals.size === 0) {
    return
  }
  const ids = [...pendingPageTabRemovals]
  pendingPageTabRemovals.clear()
  await runSearchCacheTask(async (session) => {
    for (const tabId of ids) {
      session.deletePageTab(tabId)
    }
  })
  scheduleSearchCachePersist()
}

/** EN: Warm after SW startup without blocking the first command macrotask. */
export function scheduleDeferredSearchCacheWarm(): void {
  if (warmScheduled) {
    return
  }
  warmScheduled = true
  setTimeout(() => {
    void warmSearchHistoryCache().catch(() => {})
    void rebuildBookmarkSearchCache().catch(() => {})
  }, 0)
}
