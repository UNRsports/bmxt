import initSqlJs, { type Database, type SqlJsStatic } from "sql.js"

import {
  SEARCH_CACHE_BOOKMARK_KEY,
  SEARCH_CACHE_DB_KEY,
  SEARCH_CACHE_HISTORY_KEY,
  SEARCH_CACHE_PAGE_KEY
} from "../../../extension-storage/keys"
import { migrateLegacySearchCacheStorage } from "./migrate-legacy-storage"
import { SearchCacheDbSession } from "./search-cache-db-session"

const SQL_WASM_PATH = "assets/search-cache/sql-wasm.wasm"

let sqlStatic: SqlJsStatic | null = null
let database: Database | null = null
let session: SearchCacheDbSession | null = null
let openPromise: Promise<SearchCacheDbSession> | null = null
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

async function openSearchCacheDbSession(): Promise<SearchCacheDbSession> {
  if (session) {
    return session
  }
  if (openPromise) {
    return openPromise
  }
  openPromise = (async () => {
    const SQL = await loadSqlStatic()
    const r = await chrome.storage.local.get(SEARCH_CACHE_DB_KEY)
    const bytes = bytesFromStorage(r[SEARCH_CACHE_DB_KEY])
    database = bytes ? new SQL.Database(bytes) : new SQL.Database()
    session = new SearchCacheDbSession(database)
    session.applySchema()
    if (!bytes) {
      const hadLegacy = await migrateLegacySearchCacheStorage(session)
      if (hadLegacy) {
        await persistSearchCacheDbInternal(session)
      }
    } else {
      const hadLegacy = await migrateLegacySearchCacheStorage(session)
      if (hadLegacy) {
        await persistSearchCacheDbInternal(session)
      }
    }
    return session
  })()
  return openPromise
}

async function persistSearchCacheDbInternal(s: SearchCacheDbSession): Promise<void> {
  if (!s.isDirty()) {
    return
  }
  const exported = s.exportBytes()
  // chrome.storage.local is JSON-backed — Uint8Array is not serializable.
  await chrome.storage.local.set({ [SEARCH_CACHE_DB_KEY]: Array.from(exported) })
  s.markClean()
}

/** EN: Serialize the in-memory SQLite file to `chrome.storage.local` (offline). */
export async function persistSearchCacheDb(): Promise<void> {
  persistChain = persistChain.then(async () => {
    const s = await openSearchCacheDbSession()
    await persistSearchCacheDbInternal(s)
  })
  return persistChain
}

/** EN: Queue cache work so parallel `--all` scopes share one DB safely. */
export async function runSearchCacheTask<T>(fn: (session: SearchCacheDbSession) => Promise<T>): Promise<T> {
  const task = taskChain.then(() => openSearchCacheDbSession().then(fn))
  taskChain = task.then(
    () => {},
    () => {}
  )
  return task
}

/** EN: Run a task and persist when the session was mutated. */
export async function runSearchCacheTaskAndPersist<T>(
  fn: (session: SearchCacheDbSession) => Promise<T>
): Promise<T> {
  const result = await runSearchCacheTask(fn)
  await persistSearchCacheDb()
  return result
}

/** EN: For tests — in-memory session without Chrome storage. */
export async function createInMemorySearchCacheSession(SQL: SqlJsStatic): Promise<SearchCacheDbSession> {
  const db = new SQL.Database()
  const s = new SearchCacheDbSession(db)
  s.applySchema()
  return s
}

/** EN: Wipe SQLite file + in-memory singleton (settings action; not `reset-bmxt`). */
export async function resetSearchCacheDatabase(): Promise<void> {
  await persistChain.catch(() => {})
  await taskChain.catch(() => {})
  if (database) {
    try {
      database.close()
    } catch {
      /* already closed */
    }
  }
  database = null
  session = null
  openPromise = null
  taskChain = Promise.resolve()
  persistChain = Promise.resolve()
  await chrome.storage.local.remove([
    SEARCH_CACHE_DB_KEY,
    SEARCH_CACHE_HISTORY_KEY,
    SEARCH_CACHE_BOOKMARK_KEY,
    SEARCH_CACHE_PAGE_KEY
  ])
}

export type { SearchCacheDbSession }
