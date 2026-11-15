/**
 * EN: In-memory search cache for `search -list` history/bookmark scopes (no SQLite).
 * JA: `search -list` 用の履歴・ブックマークキャッシュ（メモリのみ、SQLite なし）。
 */

import {
  HISTORY_LOOKBACK_MS,
  HISTORY_PATTERN_START_TIME_MS,
  MAX_BOOKMARK_ROWS,
  MAX_HISTORY_RESULTS
} from "../limits.ts"
import { bookmarkTreeRevision, flattenBookmarkTreeWithRevision } from "./bookmark-revision.ts"
import { isHistoryCacheEntryFresh } from "./stale.ts"
import type { BookmarkCacheEntry, HistoryCacheEntry } from "./types.ts"

const HISTORY_PROBE_MAX = 32
const HISTORY_PROBE_WINDOW_MS = 60_000

type HistoryCacheState = {
  lookbackMs: number
  maxResults: number
  maxLastVisit: number
  byUrl: Map<string, HistoryCacheEntry>
}

/** EN: History rows plus whether the browser API cap / lookback window applied. */
export type HistorySearchResolution = {
  entries: HistoryCacheEntry[]
  /** EN: True when the API returned exactly maxResults (likely truncated). */
  hitMaxResults: boolean
  /**
   * EN: Lookback window for browse-all; `null` means keyword search from epoch (all available).
   * JA: 一覧時の遡及窓。`null` はキーワード検索で epoch 起算（取得可能な全期間）。
   */
  lookbackMs: number | null
  maxResults: number
}

let historyCache: HistoryCacheState | null = null
let bookmarkCache: { revision: string; entries: BookmarkCacheEntry[] } | null = null

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

async function fetchLiveHistoryEntries(
  queryText: string,
  startTime: number
): Promise<HistoryCacheEntry[]> {
  const items = await chrome.history.search({
    text: queryText,
    maxResults: MAX_HISTORY_RESULTS,
    startTime
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

function historyConfigMatches(state: HistoryCacheState): boolean {
  return state.lookbackMs === HISTORY_LOOKBACK_MS && state.maxResults === MAX_HISTORY_RESULTS
}

function listCachedHistory(state: HistoryCacheState): HistoryCacheEntry[] {
  const minTime = Date.now() - HISTORY_LOOKBACK_MS
  const rows: HistoryCacheEntry[] = []
  for (const row of state.byUrl.values()) {
    if (row.lastVisitTime >= minTime) {
      rows.push(row)
    }
  }
  rows.sort((a, b) => b.lastVisitTime - a.lastVisitTime)
  if (rows.length > MAX_HISTORY_RESULTS) {
    return rows.slice(0, MAX_HISTORY_RESULTS)
  }
  return rows
}

function trimHistoryRows(state: HistoryCacheState): void {
  const kept = listCachedHistory(state)
  state.byUrl.clear()
  let maxLastVisit = 0
  for (const row of kept) {
    state.byUrl.set(row.url, row)
    if (row.lastVisitTime > maxLastVisit) {
      maxLastVisit = row.lastVisitTime
    }
  }
  state.maxLastVisit = maxLastVisit
}

function syncHistoryConfigMeta(state: HistoryCacheState): void {
  state.lookbackMs = HISTORY_LOOKBACK_MS
  state.maxResults = MAX_HISTORY_RESULTS
  trimHistoryRows(state)
}

function emptyHistoryCache(): HistoryCacheState {
  return {
    lookbackMs: HISTORY_LOOKBACK_MS,
    maxResults: MAX_HISTORY_RESULTS,
    maxLastVisit: 0,
    byUrl: new Map()
  }
}

async function historyProbeNeedsFullRefresh(state: HistoryCacheState): Promise<boolean> {
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
    const cached = state.byUrl.get(row.url)
    if (!isHistoryCacheEntryFresh(cached, row.url, row.lastVisitTime)) {
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
  return newestRow.lastVisitTime > state.maxLastVisit
}

let searchCacheListenersRegistered = false

function isServiceWorkerContext(): boolean {
  return typeof window === "undefined"
}

function onHistoryVisited(item: chrome.history.HistoryItem): void {
  void upsertHistoryCacheOnVisit(item)
}

function onBookmarkTreeChanged(): void {
  void rebuildBookmarkSearchCache()
}

/** EN: Register Chrome listeners once — SW only, on first `search` use. */
export function ensureSearchCacheBackgroundListeners(): void {
  if (!isServiceWorkerContext() || searchCacheListenersRegistered) {
    return
  }
  searchCacheListenersRegistered = true

  chrome.history.onVisited.addListener(onHistoryVisited)
  chrome.bookmarks.onCreated.addListener(onBookmarkTreeChanged)
  chrome.bookmarks.onChanged.addListener(onBookmarkTreeChanged)
  chrome.bookmarks.onMoved.addListener(onBookmarkTreeChanged)
  chrome.bookmarks.onRemoved.addListener(onBookmarkTreeChanged)
}

function touchSearchCache(): void {
  ensureSearchCacheBackgroundListeners()
}

/**
 * EN: Resolve history rows for search.
 *     Non-empty `pattern` uses Chrome's `history.search({ text })` from epoch (all available).
 *     Empty pattern keeps the in-memory cache / finite lookback path.
 * JA: パターンありは Chrome 側 text 絞り込み＋全期間（epoch 起算）。
 *     空パターンは従来どおりキャッシュ／有限ルックバック。
 */
export async function resolveHistoryEntriesForSearch(
  pattern = ""
): Promise<HistorySearchResolution> {
  touchSearchCache()
  const needle = pattern.trim()

  // EN: Pattern query — skip full-cache rebuild; Chrome filters across all available history.
  if (needle.length > 0) {
    const entries = await fetchLiveHistoryEntries(needle, HISTORY_PATTERN_START_TIME_MS)
    return {
      entries,
      hitMaxResults: entries.length >= MAX_HISTORY_RESULTS,
      lookbackMs: null,
      maxResults: MAX_HISTORY_RESULTS
    }
  }

  let state = historyCache
  if (state && historyConfigMatches(state)) {
    const cached = listCachedHistory(state)
    if (cached.length > 0 && !(await historyProbeNeedsFullRefresh(state))) {
      return {
        entries: cached,
        hitMaxResults: cached.length >= MAX_HISTORY_RESULTS,
        lookbackMs: HISTORY_LOOKBACK_MS,
        maxResults: MAX_HISTORY_RESULTS
      }
    }
  }

  if (!state || !historyConfigMatches(state)) {
    state = emptyHistoryCache()
    historyCache = state
  }

  const live = await fetchLiveHistoryEntries("", Date.now() - HISTORY_LOOKBACK_MS)
  for (const row of live) {
    const existing = state.byUrl.get(row.url)
    if (isHistoryCacheEntryFresh(existing, row.url, row.lastVisitTime)) {
      continue
    }
    state.byUrl.set(row.url, row)
  }
  syncHistoryConfigMeta(state)
  const entries = listCachedHistory(state)
  return {
    entries,
    hitMaxResults: entries.length >= MAX_HISTORY_RESULTS || live.length >= MAX_HISTORY_RESULTS,
    lookbackMs: HISTORY_LOOKBACK_MS,
    maxResults: MAX_HISTORY_RESULTS
  }
}

/** EN: Background `history.onVisited` — upsert in-memory cache when active. */
export async function upsertHistoryCacheOnVisit(item: chrome.history.HistoryItem): Promise<void> {
  const row = historyEntryFromItem(item)
  if (!row || !historyCache) {
    return
  }
  const state = historyCache
  const existing = state.byUrl.get(row.url)
  if (existing && existing.lastVisitTime >= row.lastVisitTime) {
    return
  }
  if (!historyConfigMatches(state)) {
    syncHistoryConfigMeta(state)
  }
  state.byUrl.set(row.url, row)
  if (row.lastVisitTime > state.maxLastVisit) {
    state.maxLastVisit = row.lastVisitTime
  }
  trimHistoryRows(state)
}

/** EN: Resolve bookmark rows — compare tree revision against in-memory cache. */
export async function resolveBookmarkEntriesForSearch(): Promise<BookmarkCacheEntry[]> {
  touchSearchCache()
  const tree = await chrome.bookmarks.getTree()
  const revision = bookmarkTreeRevision(tree)
  if (bookmarkCache && bookmarkCache.revision === revision && bookmarkCache.entries.length > 0) {
    return bookmarkCache.entries
  }
  const { entries } = flattenBookmarkTreeWithRevision(tree, MAX_BOOKMARK_ROWS)
  bookmarkCache = { revision, entries }
  return entries
}

/** EN: Rebuild bookmark rows after tree mutations. */
export async function rebuildBookmarkSearchCache(): Promise<void> {
  touchSearchCache()
  const tree = await chrome.bookmarks.getTree()
  const { revision, entries } = flattenBookmarkTreeWithRevision(tree, MAX_BOOKMARK_ROWS)
  bookmarkCache = { revision, entries }
}

/** EN: Legacy no-op — page scope is live-only. */
export async function removePageCacheTab(_tabId: number): Promise<void> {}

/** EN: Legacy no-op — nothing to flush without SQLite. */
export async function flushSearchCacheDb(): Promise<void> {}
