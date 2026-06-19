import initSqlJs, { type Database, type SqlJsStatic } from "sql.js"

import { JOB_DB_KEY } from "../../extension-storage/keys.ts"
import type { JobKind, JobMeta, JobRecord, JobStatus } from "../job-types.ts"
import { JobDbSession } from "./job-db-session.ts"

const SQL_WASM_PATH = "assets/search-cache/sql-wasm.wasm"

let sqlStatic: SqlJsStatic | null = null
let database: Database | null = null
let session: JobDbSession | null = null
let openPromise: Promise<JobDbSession> | null = null
let taskChain: Promise<unknown> = Promise.resolve()
let persistChain: Promise<void> = Promise.resolve()

function wasmUrl(): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(SQL_WASM_PATH)
  }
  return SQL_WASM_PATH
}

async function loadSqlStatic(): Promise<SqlJsStatic> {
  if (sqlStatic) {
    return sqlStatic
  }
  sqlStatic = await initSqlJs({
    locateFile: () => wasmUrl()
  })
  return sqlStatic
}

function bytesFromStorage(raw: unknown): Uint8Array | null {
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw)
  }
  if (ArrayBuffer.isView(raw)) {
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  }
  if (Array.isArray(raw) && raw.every((n) => typeof n === "number")) {
    return Uint8Array.from(raw)
  }
  return null
}

async function openJobDbSession(): Promise<JobDbSession> {
  if (session) {
    return session
  }
  if (openPromise) {
    return openPromise
  }
  openPromise = (async () => {
    const SQL = await loadSqlStatic()
    let bytes: Uint8Array | null = null
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const r = await chrome.storage.local.get(JOB_DB_KEY)
      bytes = bytesFromStorage(r[JOB_DB_KEY])
    }
    database = bytes ? new SQL.Database(bytes) : new SQL.Database()
    session = new JobDbSession(database)
    session.applySchema()
    return session
  })()
  return openPromise
}

async function persistJobDbInternal(s: JobDbSession): Promise<void> {
  if (!s.isDirty()) {
    return
  }
  const exported = s.exportBytes()
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [JOB_DB_KEY]: Array.from(exported) })
  }
  s.markClean()
}

export async function persistJobDb(): Promise<void> {
  persistChain = persistChain.then(async () => {
    const s = await openJobDbSession()
    await persistJobDbInternal(s)
  })
  return persistChain
}

export async function runJobDbTask<T>(fn: (s: JobDbSession) => Promise<T> | T): Promise<T> {
  const task = taskChain.then(() => openJobDbSession().then(fn))
  taskChain = task.then(
    () => {},
    () => {}
  )
  return task
}

function serializeMeta(meta: JobMeta | undefined): string | null {
  if (!meta || Object.keys(meta).length === 0) {
    return null
  }
  try {
    return JSON.stringify(meta)
  } catch {
    return null
  }
}

/** EN: Allocate a monotonic job id and persist a `running` row (best-effort). */
export async function persistJobStarted(
  scopeId: string,
  kind: JobKind,
  meta?: JobMeta
): Promise<number> {
  const now = Date.now()
  const id = await runJobDbTask((s) => s.allocateJobId())
  const record: JobRecord = {
    id,
    scopeId,
    kind,
    status: "running",
    createdAt: now,
    updatedAt: now,
    metaJson: serializeMeta(meta),
    error: null
  }
  await runJobDbTask((s) => {
    s.insertJob(record)
  })
  void persistJobDb()
  return id
}

/** EN: Update persisted lifecycle (best-effort; never throws to callers). */
export async function persistJobFinished(
  id: number,
  status: Exclude<JobStatus, "running">,
  error: string | null = null
): Promise<void> {
  try {
    await runJobDbTask((s) => {
      s.updateJobStatus(id, status, Date.now(), error)
    })
    await persistJobDb()
  } catch {
    /* audit trail is optional */
  }
}

/** EN: For tests — in-memory session without Chrome storage. */
export async function createInMemoryJobDbSession(SQL: SqlJsStatic): Promise<JobDbSession> {
  const db = new SQL.Database()
  const s = new JobDbSession(db)
  s.applySchema()
  return s
}

export type { JobDbSession }
