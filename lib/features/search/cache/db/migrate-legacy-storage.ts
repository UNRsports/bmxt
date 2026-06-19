/**
 * EN: Legacy chrome.storage payloads → unified SQLite (one-time migration).
 */

import {
  SEARCH_CACHE_BOOKMARK_KEY,
  SEARCH_CACHE_DB_KEY,
  SEARCH_CACHE_HISTORY_KEY,
  SEARCH_CACHE_PAGE_KEY
} from "../../../extension-storage/keys"
import { SEARCH_CACHE_SCHEMA_VERSION } from "../types"
import type {
  BookmarkCacheEntry,
  HistoryCacheEntry,
  PageTabCacheEntry,
  SearchBookmarkCachePayload,
  SearchHistoryCachePayload,
  SearchPageCachePayload
} from "../types"
import type { SearchCacheDbSession } from "./search-cache-db-session"
import {
  META_BOOKMARK_REVISION,
  META_HISTORY_LOOKBACK_MS,
  META_HISTORY_MAX_LAST_VISIT,
  META_HISTORY_MAX_RESULTS
} from "./schema"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function readHistoryPayload(raw: unknown): SearchHistoryCachePayload | null {
  if (!isRecord(raw) || raw.v !== SEARCH_CACHE_SCHEMA_VERSION || !Array.isArray(raw.entries)) {
    return null
  }
  const entries = raw.entries.filter(
    (e): e is HistoryCacheEntry =>
      isRecord(e) &&
      typeof e.url === "string" &&
      typeof e.title === "string" &&
      typeof e.lastVisitTime === "number"
  )
  return {
    v: SEARCH_CACHE_SCHEMA_VERSION,
    lookbackMs: typeof raw.lookbackMs === "number" ? raw.lookbackMs : 0,
    maxResults: typeof raw.maxResults === "number" ? raw.maxResults : 0,
    entries,
    maxLastVisitTime: typeof raw.maxLastVisitTime === "number" ? raw.maxLastVisitTime : 0,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0
  }
}

function readBookmarkPayload(raw: unknown): SearchBookmarkCachePayload | null {
  if (!isRecord(raw) || raw.v !== SEARCH_CACHE_SCHEMA_VERSION || !Array.isArray(raw.entries)) {
    return null
  }
  const entries = raw.entries.filter(
    (e): e is BookmarkCacheEntry =>
      isRecord(e) &&
      typeof e.title === "string" &&
      typeof e.url === "string" &&
      typeof e.dateAdded === "number"
  )
  return {
    v: SEARCH_CACHE_SCHEMA_VERSION,
    entries,
    revision: typeof raw.revision === "string" ? raw.revision : "",
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0
  }
}

function readPagePayload(raw: unknown): SearchPageCachePayload | null {
  if (!isRecord(raw) || raw.v !== SEARCH_CACHE_SCHEMA_VERSION || !isRecord(raw.byTabId)) {
    return null
  }
  const byTabId: SearchPageCachePayload["byTabId"] = {}
  for (const [key, value] of Object.entries(raw.byTabId)) {
    if (!isRecord(value)) {
      continue
    }
    if (
      typeof value.tabId !== "number" ||
      typeof value.url !== "string" ||
      typeof value.title !== "string" ||
      typeof value.windowId !== "number" ||
      (value.text !== null && typeof value.text !== "string") ||
      typeof value.dataTimestamp !== "number" ||
      typeof value.fetchedAt !== "number"
    ) {
      continue
    }
    byTabId[key] = {
      tabId: value.tabId,
      url: value.url,
      title: value.title,
      windowId: value.windowId,
      text: value.text === null ? null : String(value.text),
      dataTimestamp: value.dataTimestamp,
      fetchedAt: value.fetchedAt
    }
  }
  return {
    v: SEARCH_CACHE_SCHEMA_VERSION,
    byTabId,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0
  }
}

function importHistory(session: SearchCacheDbSession, payload: SearchHistoryCachePayload): void {
  for (const row of payload.entries) {
    session.upsertHistoryRow(row.url, row.title, row.lastVisitTime)
  }
  session.setMeta(META_HISTORY_LOOKBACK_MS, String(payload.lookbackMs))
  session.setMeta(META_HISTORY_MAX_RESULTS, String(payload.maxResults))
  session.setMeta(META_HISTORY_MAX_LAST_VISIT, String(payload.maxLastVisitTime))
}

function importBookmark(session: SearchCacheDbSession, payload: SearchBookmarkCachePayload): void {
  session.clearBookmarkRows()
  for (const row of payload.entries) {
    session.upsertBookmarkRow(row.url, row.title, row.dateAdded)
  }
  session.setMeta(META_BOOKMARK_REVISION, payload.revision)
}

function importPageTabs(session: SearchCacheDbSession, payload: SearchPageCachePayload): void {
  for (const entry of Object.values(payload.byTabId)) {
    session.upsertPageTab(entry)
  }
}

/** EN: Import split storage keys into the unified DB when present. */
export async function migrateLegacySearchCacheStorage(
  session: SearchCacheDbSession
): Promise<boolean> {
  const r = await chrome.storage.local.get([
    SEARCH_CACHE_HISTORY_KEY,
    SEARCH_CACHE_BOOKMARK_KEY,
    SEARCH_CACHE_PAGE_KEY
  ])
  const history = readHistoryPayload(r[SEARCH_CACHE_HISTORY_KEY])
  const bookmark = readBookmarkPayload(r[SEARCH_CACHE_BOOKMARK_KEY])
  const page = readPagePayload(r[SEARCH_CACHE_PAGE_KEY])
  if (!history && !bookmark && !page) {
    return false
  }
  if (history) {
    importHistory(session, history)
  }
  if (bookmark) {
    importBookmark(session, bookmark)
  }
  if (page) {
    importPageTabs(session, page)
  }
  await chrome.storage.local.remove([
    SEARCH_CACHE_HISTORY_KEY,
    SEARCH_CACHE_BOOKMARK_KEY,
    SEARCH_CACHE_PAGE_KEY
  ])
  return true
}

/** EN: Detect whether a DB blob already exists in storage. */
export async function searchCacheDbBlobExists(): Promise<boolean> {
  const r = await chrome.storage.local.get(SEARCH_CACHE_DB_KEY)
  return r[SEARCH_CACHE_DB_KEY] !== undefined
}
