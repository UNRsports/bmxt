import type { Database } from "sql.js"

import type { PageTabCacheEntry } from "../types"
import {
  META_BOOKMARK_REVISION,
  META_HISTORY_LOOKBACK_MS,
  META_HISTORY_MAX_LAST_VISIT,
  META_HISTORY_MAX_RESULTS,
  META_SCHEMA_VERSION,
  SEARCH_CACHE_DB_SCHEMA_VERSION,
  SEARCH_CACHE_SCHEMA_SQL
} from "./schema"

/** EN: Thin SQL wrapper — all search cache reads/writes go through one session. */
export class SearchCacheDbSession {
  private readonly db: Database
  private dirty = false

  constructor(db: Database) {
    this.db = db
  }

  applySchema(): void {
    this.db.run(SEARCH_CACHE_SCHEMA_SQL)
    this.setMeta(META_SCHEMA_VERSION, String(SEARCH_CACHE_DB_SCHEMA_VERSION))
    this.dirty = true
  }

  isDirty(): boolean {
    return this.dirty
  }

  markClean(): void {
    this.dirty = false
  }

  exportBytes(): Uint8Array {
    return this.db.export()
  }

  getMeta(key: string): string | null {
    const stmt = this.db.prepare(`SELECT value FROM cache_meta WHERE key = ?`)
    stmt.bind([key])
    if (!stmt.step()) {
      stmt.free()
      return null
    }
    const row = stmt.getAsObject() as { value?: unknown }
    stmt.free()
    return typeof row.value === "string" ? row.value : null
  }

  setMeta(key: string, value: string): void {
    this.db.run(
      `INSERT INTO cache_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
    this.dirty = true
  }

  getMetaNumber(key: string, fallback: number): number {
    const raw = this.getMeta(key)
    if (raw === null) {
      return fallback
    }
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  }

  upsertHistoryRow(url: string, title: string, lastVisitTime: number): void {
    const now = Date.now()
    this.db.run(
      `INSERT INTO url_resource (url, title, history_last_visit_time, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET
         title = CASE
           WHEN excluded.history_last_visit_time >= COALESCE(url_resource.history_last_visit_time, 0)
           THEN excluded.title ELSE url_resource.title END,
         history_last_visit_time = CASE
           WHEN excluded.history_last_visit_time >= COALESCE(url_resource.history_last_visit_time, 0)
           THEN excluded.history_last_visit_time ELSE url_resource.history_last_visit_time END,
         updated_at = excluded.updated_at`,
      [url, title, lastVisitTime, now]
    )
    this.dirty = true
  }

  getHistoryRow(url: string): { url: string; title: string; lastVisitTime: number } | null {
    const stmt = this.db.prepare(
      `SELECT url, title, history_last_visit_time AS lastVisitTime
       FROM url_resource WHERE url = ? AND history_last_visit_time IS NOT NULL`
    )
    stmt.bind([url])
    if (!stmt.step()) {
      stmt.free()
      return null
    }
    const row = stmt.getAsObject() as {
      url?: unknown
      title?: unknown
      lastVisitTime?: unknown
    }
    stmt.free()
    if (typeof row.url !== "string" || typeof row.lastVisitTime !== "number") {
      return null
    }
    return {
      url: row.url,
      title: typeof row.title === "string" ? row.title : "",
      lastVisitTime: row.lastVisitTime
    }
  }

  listHistoryRows(limit: number, minLastVisitTime: number): Array<{
    url: string
    title: string
    lastVisitTime: number
  }> {
    const stmt = this.db.prepare(
      `SELECT url, title, history_last_visit_time AS lastVisitTime
       FROM url_resource
       WHERE history_last_visit_time IS NOT NULL AND history_last_visit_time >= ?
       ORDER BY history_last_visit_time DESC
       LIMIT ?`
    )
    stmt.bind([minLastVisitTime, limit])
    const out: Array<{ url: string; title: string; lastVisitTime: number }> = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as {
        url?: unknown
        title?: unknown
        lastVisitTime?: unknown
      }
      if (typeof row.url !== "string" || typeof row.lastVisitTime !== "number") {
        continue
      }
      out.push({
        url: row.url,
        title: typeof row.title === "string" ? row.title : "",
        lastVisitTime: row.lastVisitTime
      })
    }
    stmt.free()
    return out
  }

  recomputeHistoryMaxLastVisit(): number {
    const stmt = this.db.prepare(
      `SELECT MAX(history_last_visit_time) AS maxTs FROM url_resource`
    )
    stmt.step()
    const row = stmt.getAsObject() as { maxTs?: unknown }
    stmt.free()
    const maxTs = typeof row.maxTs === "number" && Number.isFinite(row.maxTs) ? row.maxTs : 0
    this.setMeta(META_HISTORY_MAX_LAST_VISIT, String(maxTs))
    return maxTs
  }

  trimHistoryRows(maxResults: number): void {
    this.db.run(
      `DELETE FROM url_resource
       WHERE history_last_visit_time IS NOT NULL
         AND url NOT IN (
           SELECT url FROM url_resource
           WHERE history_last_visit_time IS NOT NULL
           ORDER BY history_last_visit_time DESC
           LIMIT ?
         )`,
      [maxResults]
    )
    this.dirty = true
    this.recomputeHistoryMaxLastVisit()
  }

  clearBookmarkRows(): void {
    this.db.run(
      `UPDATE url_resource SET bookmark_date_added = NULL, bookmark_title = NULL
       WHERE bookmark_date_added IS NOT NULL`
    )
    this.dirty = true
  }

  upsertBookmarkRow(url: string, title: string, dateAdded: number): void {
    const now = Date.now()
    this.db.run(
      `INSERT INTO url_resource (url, title, bookmark_date_added, bookmark_title, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET
         bookmark_date_added = excluded.bookmark_date_added,
         bookmark_title = excluded.bookmark_title,
         title = CASE
           WHEN url_resource.history_last_visit_time IS NULL THEN excluded.title
           ELSE url_resource.title END,
         updated_at = excluded.updated_at`,
      [url, title, dateAdded, title, now]
    )
    this.dirty = true
  }

  listBookmarkRows(limit: number): Array<{ title: string; url: string; dateAdded: number }> {
    const stmt = this.db.prepare(
      `SELECT url, bookmark_title AS title, bookmark_date_added AS dateAdded
       FROM url_resource
       WHERE bookmark_date_added IS NOT NULL
       ORDER BY bookmark_date_added ASC
       LIMIT ?`
    )
    stmt.bind([limit])
    const out: Array<{ title: string; url: string; dateAdded: number }> = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as { url?: unknown; title?: unknown; dateAdded?: unknown }
      if (typeof row.url !== "string" || typeof row.dateAdded !== "number") {
        continue
      }
      out.push({
        url: row.url,
        title: typeof row.title === "string" ? row.title : "",
        dateAdded: row.dateAdded
      })
    }
    stmt.free()
    return out
  }

  getPageTab(tabId: number): PageTabCacheEntry | null {
    const stmt = this.db.prepare(
      `SELECT tab_id AS tabId, url, title, window_id AS windowId,
              page_text AS text, data_timestamp AS dataTimestamp, fetched_at AS fetchedAt
       FROM page_tab WHERE tab_id = ?`
    )
    stmt.bind([tabId])
    if (!stmt.step()) {
      stmt.free()
      return null
    }
    const row = stmt.getAsObject() as {
      tabId?: unknown
      url?: unknown
      title?: unknown
      windowId?: unknown
      text?: unknown
      dataTimestamp?: unknown
      fetchedAt?: unknown
    }
    stmt.free()
    if (
      typeof row.tabId !== "number" ||
      typeof row.url !== "string" ||
      typeof row.dataTimestamp !== "number" ||
      typeof row.fetchedAt !== "number"
    ) {
      return null
    }
    return {
      tabId: row.tabId,
      url: row.url,
      title: typeof row.title === "string" ? row.title : "",
      windowId: typeof row.windowId === "number" ? row.windowId : 0,
      text: row.text === null || typeof row.text === "string" ? (row.text as string | null) : null,
      dataTimestamp: row.dataTimestamp,
      fetchedAt: row.fetchedAt
    }
  }

  upsertPageTab(entry: PageTabCacheEntry): void {
    this.db.run(
      `INSERT INTO page_tab
         (tab_id, url, title, window_id, page_text, data_timestamp, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tab_id) DO UPDATE SET
         url = excluded.url,
         title = excluded.title,
         window_id = excluded.window_id,
         page_text = excluded.page_text,
         data_timestamp = excluded.data_timestamp,
         fetched_at = excluded.fetched_at`,
      [
        entry.tabId,
        entry.url,
        entry.title,
        entry.windowId,
        entry.text,
        entry.dataTimestamp,
        entry.fetchedAt
      ]
    )
    this.dirty = true
  }

  deletePageTab(tabId: number): void {
    this.db.run(`DELETE FROM page_tab WHERE tab_id = ?`, [tabId])
    this.dirty = true
  }

  prunePageTabsExcept(openTabIds: ReadonlySet<number>): void {
    const stmt = this.db.prepare(`SELECT tab_id FROM page_tab`)
    const toDelete: number[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as { tab_id?: unknown }
      if (typeof row.tab_id === "number" && !openTabIds.has(row.tab_id)) {
        toDelete.push(row.tab_id)
      }
    }
    stmt.free()
    for (const tabId of toDelete) {
      this.deletePageTab(tabId)
    }
  }
}
