/** EN: Single SQLite schema for history/bookmark cache. `page_tab` retained for legacy migration/cleanup only. */

export const SEARCH_CACHE_DB_SCHEMA_VERSION = 2

export const SEARCH_CACHE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cache_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS url_resource (
  url TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  history_last_visit_time INTEGER,
  bookmark_date_added INTEGER,
  bookmark_title TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS page_tab (
  tab_id INTEGER PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  window_id INTEGER NOT NULL DEFAULT 0,
  page_text TEXT,
  data_timestamp INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_url_resource_history
  ON url_resource (history_last_visit_time DESC);
CREATE INDEX IF NOT EXISTS idx_url_resource_bookmark
  ON url_resource (bookmark_date_added);
`

export const META_SCHEMA_VERSION = "schema_version"
export const META_BOOKMARK_REVISION = "bookmark_revision"
export const META_HISTORY_LOOKBACK_MS = "history_lookback_ms"
export const META_HISTORY_MAX_RESULTS = "history_max_results"
export const META_HISTORY_MAX_LAST_VISIT = "history_max_last_visit_time"
