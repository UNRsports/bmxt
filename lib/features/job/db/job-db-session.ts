import type { Database } from "sql.js"

import type { JobKind, JobRecord, JobStatus } from "../job-types.ts"
import {
  JOB_DB_PRUNE_KEEP_PER_SCOPE,
  JOB_DB_SCHEMA_SQL,
  JOB_DB_SCHEMA_VERSION,
  META_JOB_NEXT_ID,
  META_JOB_SCHEMA_VERSION
} from "./schema.ts"

export class JobDbSession {
  private dirty = false

  constructor(private readonly db: Database) {}

  applySchema(): void {
    this.db.run(JOB_DB_SCHEMA_SQL)
    const version = this.getMeta(META_JOB_SCHEMA_VERSION)
    if (version === null) {
      this.setMeta(META_JOB_SCHEMA_VERSION, String(JOB_DB_SCHEMA_VERSION))
      this.setMeta(META_JOB_NEXT_ID, "1")
    }
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
    const stmt = this.db.prepare("SELECT value FROM job_meta WHERE key = ?")
    stmt.bind([key])
    if (!stmt.step()) {
      stmt.free()
      return null
    }
    const row = stmt.getAsObject() as { value?: string }
    stmt.free()
    return typeof row.value === "string" ? row.value : null
  }

  setMeta(key: string, value: string): void {
    this.db.run(
      "INSERT INTO job_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    )
    this.dirty = true
  }

  allocateJobId(): number {
    const raw = this.getMeta(META_JOB_NEXT_ID)
    const next = raw !== null ? Number.parseInt(raw, 10) : 1
    const id = Number.isFinite(next) && next > 0 ? next : 1
    this.setMeta(META_JOB_NEXT_ID, String(id + 1))
    return id
  }

  insertJob(record: JobRecord): void {
    this.db.run(
      `INSERT INTO job_record
        (id, scope_id, kind, status, created_at, updated_at, meta_json, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.scopeId,
        record.kind,
        record.status,
        record.createdAt,
        record.updatedAt,
        record.metaJson,
        record.error
      ]
    )
    this.dirty = true
    this.pruneCompletedForScope(record.scopeId)
  }

  updateJobStatus(id: number, status: JobStatus, updatedAt: number, error: string | null): void {
    this.db.run(
      "UPDATE job_record SET status = ?, updated_at = ?, error = ? WHERE id = ?",
      [status, updatedAt, error, id]
    )
    this.dirty = true
  }

  pruneCompletedForScope(scopeId: string): void {
    const stmt = this.db.prepare(
      `SELECT id FROM job_record
       WHERE scope_id = ? AND status IN ('completed', 'cancelled', 'failed', 'superseded')
       ORDER BY updated_at DESC`
    )
    stmt.bind([scopeId])
    const ids: number[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as { id?: number }
      if (typeof row.id === "number") {
        ids.push(row.id)
      }
    }
    stmt.free()
    if (ids.length <= JOB_DB_PRUNE_KEEP_PER_SCOPE) {
      return
    }
    const drop = ids.slice(JOB_DB_PRUNE_KEEP_PER_SCOPE)
    for (const id of drop) {
      this.db.run("DELETE FROM job_record WHERE id = ?", [id])
    }
    this.dirty = true
  }

  listRecentForScope(scopeId: string, limit = 32): JobRecord[] {
    const stmt = this.db.prepare(
      `SELECT id, scope_id, kind, status, created_at, updated_at, meta_json, error
       FROM job_record
       WHERE scope_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    stmt.bind([scopeId, limit])
    const out: JobRecord[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as {
        id?: number
        scope_id?: string
        kind?: string
        status?: string
        created_at?: number
        updated_at?: number
        meta_json?: string | null
        error?: string | null
      }
      if (
        typeof row.id !== "number" ||
        typeof row.scope_id !== "string" ||
        typeof row.kind !== "string" ||
        typeof row.status !== "string" ||
        typeof row.created_at !== "number" ||
        typeof row.updated_at !== "number"
      ) {
        continue
      }
      out.push({
        id: row.id,
        scopeId: row.scope_id,
        kind: row.kind as JobKind,
        status: row.status as JobStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metaJson: row.meta_json ?? null,
        error: row.error ?? null
      })
    }
    stmt.free()
    return out
  }
}
