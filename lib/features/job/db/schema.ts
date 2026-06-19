/** EN: SQLite schema for persisted job lifecycle records. */

export const JOB_DB_SCHEMA_VERSION = 1

export const JOB_DB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS job_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_record (
  id INTEGER PRIMARY KEY NOT NULL,
  scope_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  meta_json TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_scope_updated
  ON job_record (scope_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_status_updated
  ON job_record (status, updated_at DESC);
`

export const META_JOB_SCHEMA_VERSION = "schema_version"
export const META_JOB_NEXT_ID = "next_job_id"

/** EN: Max completed/superseded rows kept per scope (older rows pruned on write). */
export const JOB_DB_PRUNE_KEEP_PER_SCOPE = 200
