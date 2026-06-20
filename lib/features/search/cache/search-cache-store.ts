/**
 * EN: Single SQLite-backed store for all `search -list` cache scopes.
 * JA: search キャッシュの単一 SQLite 情報源（history / bookmark / page 共通）。
 */

import { HISTORY_LOOKBACK_MS, MAX_BOOKMARK_ROWS, MAX_HISTORY_RESULTS } from "../limits"
import { bookmarkTreeRevision, flattenBookmarkTreeWithRevision } from "./bookmark-revision"
import {
  persistSearchCacheDb,
  resetSearchCacheDatabase,
  runSearchCacheTask,
  runSearchCacheTaskAndPersist,
  scheduleSearchCachePersist,
  flushSearchCachePersist,
  type SearchCacheDbSession
} from "./db/search-cache-db"
import {
  META_BOOKMARK_REVISION,
  META_HISTORY_LOOKBACK_MS,
  META_HISTORY_MAX_LAST_VISIT,
  META_HISTORY_MAX_RESULTS
} from "./db/schema"
import { isHistoryCacheEntryFresh } from "./stale"
import type { BookmarkCacheEntry, HistoryCacheEntry } from "./types"

const HISTORY_PROBE_MAX = 32
const HISTORY_PROBE_WINDOW_MS = 60_000

function historyEntryFromItem(it: chrome.history.HistoryItem): HistoryCacheEntry | null {
  const url = it.url ?? ""
  if (!url) {
    return null
  }
  return {
    url,
    title: it.title ?? "",
    lastVisitTime: it.lastVisitTime ?? 0
  }
}

async function fetchLiveHistoryEntries(): Promise<HistoryCacheEntry[]> {
  const items = await chrome.history.search({
    text: "",
    maxResults: MAX_HISTORY_RESULTS,
    startTime: Date.now() - HISTORY_LOOKBACK_MS
  })
  const out: HistoryCacheEntry[] = []
  for (const it of items) {
    const row = historyEntryFromItem(it)
    if (row) {
      out.push(row)
    }
  }
  return out
}

function historyConfigMatches(session: SearchCacheDbSession): boolean {
  return (
    session.getMetaNumber(META_HISTORY_LOOKBACK_MS, -1) === HISTORY_LOOKBACK_MS &&
    session.getMetaNumber(META_HISTORY_MAX_RESULTS, -1) === MAX_HISTORY_RESULTS
  )
}

async function historyProbeNeedsFullRefresh(session: SearchCacheDbSession): Promise<boolean> {
  const probe = await chrome.history.search({
    text: "",
    maxResults: HISTORY_PROBE_MAX,
    startTime: Date.now() - HISTORY_PROBE_WINDOW_MS
  })
  for (const it of probe) {
    const row = historyEntryFromItem(it)
    if (!row) {
      continue
    }
    const cached = session.getHistoryRow(row.url)
    if (!isHistoryCacheEntryFresh(cached ?? undefined, row.url, row.lastVisitTime)) {
      return true
    }
  }
  if (probe.length === 0) {
    return false
  }
  const newest = probe[0]!
  const newestRow = historyEntryFromItem(newest)
  if (!newestRow) {
    return false
  }
  const maxCached = session.getMetaNumber(META_HISTORY_MAX_LAST_VISIT, 0)
  return newestRow.lastVisitTime > maxCached
}

function syncHistoryConfigMeta(session: SearchCacheDbSession): void {
  session.setMeta(META_HISTORY_LOOKBACK_MS, String(HISTORY_LOOKBACK_MS))
  session.setMeta(META_HISTORY_MAX_RESULTS, String(MAX_HISTORY_RESULTS))
  session.recomputeHistoryMaxLastVisit()
}

function listCachedHistory(session: SearchCacheDbSession): HistoryCacheEntry[] {
  const minTime = Date.now() - HISTORY_LOOKBACK_MS
  return session.listHistoryRows(MAX_HISTORY_RESULTS, minTime).map((row) => ({
    url: row.url,
    title: row.title,
    lastVisitTime: row.lastVisitTime
  }))
}

/** EN: Resolve history rows — compare live Chrome data against the unified DB. */
export async function resolveHistoryEntriesForSearch(): Promise<HistoryCacheEntry[]> {
  return runSearchCacheTaskAndPersist(async (session) => {
    const cached = listCachedHistory(session)
    if (
      cached.length > 0 &&
      historyConfigMatches(session) &&
      !(await historyProbeNeedsFullRefresh(session))
    ) {
      return cached
    }

    const live = await fetchLiveHistoryEntries()
    for (const row of live) {
      const existing = session.getHistoryRow(row.url)
      if (isHistoryCacheEntryFresh(existing ?? undefined, row.url, row.lastVisitTime)) {
        continue
      }
      session.upsertHistoryRow(row.url, row.title, row.lastVisitTime)
    }
    session.trimHistoryRows(MAX_HISTORY_RESULTS)
    syncHistoryConfigMeta(session)
    return listCachedHistory(session)
  })
}

/** EN: Background `history.onVisited` — upsert into unified DB. */
export async function upsertHistoryCacheOnVisit(item: chrome.history.HistoryItem): Promise<void> {
  const row = historyEntryFromItem(item)
  if (!row) {
    return
  }
  await runSearchCacheTask(async (session) => {
    const existing = session.getHistoryRow(row.url)
    if (existing && existing.lastVisitTime >= row.lastVisitTime) {
      return
    }
    if (!historyConfigMatches(session)) {
      syncHistoryConfigMeta(session)
    }
    session.upsertHistoryRow(row.url, row.title, row.lastVisitTime)
    session.trimHistoryRows(MAX_HISTORY_RESULTS)
    syncHistoryConfigMeta(session)
  })
  scheduleSearchCachePersist()
}

/** EN: Warm history table on startup. */
export async function warmSearchHistoryCache(): Promise<void> {
  const live = await fetchLiveHistoryEntries()
  await runSearchCacheTask(async (session) => {
    for (const row of live) {
      session.upsertHistoryRow(row.url, row.title, row.lastVisitTime)
    }
    session.trimHistoryRows(MAX_HISTORY_RESULTS)
    syncHistoryConfigMeta(session)
  })
  scheduleSearchCachePersist()
}

/** EN: Resolve bookmark rows — compare tree revision against unified DB meta. */
export async function resolveBookmarkEntriesForSearch(): Promise<BookmarkCacheEntry[]> {
  const tree = await chrome.bookmarks.getTree()
  const revision = bookmarkTreeRevision(tree)
  return runSearchCacheTask(async (session) => {
    const cachedRevision = session.getMeta(META_BOOKMARK_REVISION)
    if (cachedRevision === revision) {
      const rows = session.listBookmarkRows(MAX_BOOKMARK_ROWS)
      if (rows.length > 0) {
        return rows
      }
    }
    const { entries } = flattenBookmarkTreeWithRevision(tree, MAX_BOOKMARK_ROWS)
    session.clearBookmarkRows()
    for (const row of entries) {
      session.upsertBookmarkRow(row.url, row.title, row.dateAdded)
    }
    session.setMeta(META_BOOKMARK_REVISION, revision)
    await persistSearchCacheDb()
    return entries
  })
}

/** EN: Rebuild bookmark rows after tree mutations. */
export async function rebuildBookmarkSearchCache(): Promise<void> {
  const tree = await chrome.bookmarks.getTree()
  const { revision, entries } = flattenBookmarkTreeWithRevision(tree, MAX_BOOKMARK_ROWS)
  await runSearchCacheTask(async (session) => {
    session.clearBookmarkRows()
    for (const row of entries) {
      session.upsertBookmarkRow(row.url, row.title, row.dateAdded)
    }
    session.setMeta(META_BOOKMARK_REVISION, revision)
  })
  scheduleSearchCachePersist()
}

/** EN: Warm bookmark table on startup. */
export async function warmSearchBookmarkCache(): Promise<void> {
  await rebuildBookmarkSearchCache()
}

/** EN: Drop one legacy `page_tab` row (migration / tab navigation cleanup only). */
export async function removePageCacheTab(tabId: number): Promise<void> {
  await runSearchCacheTask(async (session) => {
    session.deletePageTab(tabId)
  })
  scheduleSearchCachePersist()
}

/** EN: Flush pending SQLite mutations after history/bookmark cache writes. */
export async function flushSearchCacheDb(): Promise<void> {
  await flushSearchCachePersist()
}

/** EN: Clear search cache DB from settings (separate from `reset-bmxt`). */
export async function resetSearchCacheFromSettings(): Promise<void> {
  await resetSearchCacheDatabase()
}
