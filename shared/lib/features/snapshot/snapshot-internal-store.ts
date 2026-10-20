import {
  MAX_INTERNAL_SNAPSHOT_FILES,
  MAX_SNAPSHOT_BODY_CHARS,
  SNAPSHOTS_STORAGE_KEY
} from "../extension-storage/keys"
import type { SnapshotsInternalStore, SnapshotEntryMeta } from "./snapshot-types"

function emptyStore(): SnapshotsInternalStore {
  return { version: 1, entries: [], files: {} }
}

function parseInternalStore(raw: unknown): SnapshotsInternalStore {
  if (!raw || typeof raw !== "object") {
    return emptyStore()
  }
  const o = raw as Partial<SnapshotsInternalStore>
  if (o.version !== 1) {
    return emptyStore()
  }
  const entries: SnapshotEntryMeta[] = []
  if (Array.isArray(o.entries)) {
    for (const item of o.entries) {
      if (!item || typeof item !== "object") {
        continue
      }
      const e = item as Partial<SnapshotEntryMeta>
      if (
        typeof e.id === "string" &&
        typeof e.fileName === "string" &&
        typeof e.title === "string" &&
        typeof e.url === "string" &&
        typeof e.savedAt === "string"
      ) {
        entries.push({
          id: e.id,
          fileName: e.fileName,
          title: e.title,
          url: e.url,
          savedAt: e.savedAt
        })
      }
    }
  }
  const files: Record<string, string> = {}
  if (o.files && typeof o.files === "object") {
    for (const [name, content] of Object.entries(o.files)) {
      if (typeof name === "string" && typeof content === "string") {
        files[name] = content
      }
    }
  }
  return { version: 1, entries, files }
}

export async function loadSnapshotsInternalStore(): Promise<SnapshotsInternalStore> {
  const r = await chrome.storage.local.get(SNAPSHOTS_STORAGE_KEY)
  return parseInternalStore(r[SNAPSHOTS_STORAGE_KEY])
}

export async function saveSnapshotsInternalStore(store: SnapshotsInternalStore): Promise<void> {
  await chrome.storage.local.set({ [SNAPSHOTS_STORAGE_KEY]: store })
}

export async function clearSnapshotsInternalStore(): Promise<void> {
  await chrome.storage.local.remove(SNAPSHOTS_STORAGE_KEY)
}

export function truncateSnapshotBody(body: string): string {
  if (body.length <= MAX_SNAPSHOT_BODY_CHARS) {
    return body
  }
  return `${body.slice(0, MAX_SNAPSHOT_BODY_CHARS)}\n\n…(truncated)`
}

export function trimInternalStoreToCap(store: SnapshotsInternalStore): SnapshotsInternalStore {
  if (store.entries.length <= MAX_INTERNAL_SNAPSHOT_FILES) {
    return store
  }
  const sorted = [...store.entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const kept = sorted.slice(0, MAX_INTERNAL_SNAPSHOT_FILES)
  const keptNames = new Set(kept.map((e) => e.fileName))
  const files: Record<string, string> = {}
  for (const name of keptNames) {
    const content = store.files[name]
    if (typeof content === "string") {
      files[name] = content
    }
  }
  return { version: 1, entries: kept, files }
}

export async function writeSnapshotToInternalStore(
  fileName: string,
  markdown: string,
  meta: SnapshotEntryMeta
): Promise<void> {
  const store = await loadSnapshotsInternalStore()
  const files = { ...store.files, [fileName]: markdown }
  const withoutDup = store.entries.filter((e) => e.fileName !== fileName)
  const entries = [meta, ...withoutDup]
  const next = trimInternalStoreToCap({ version: 1, entries, files })
  await saveSnapshotsInternalStore(next)
}

export function listInternalSnapshotDocuments(
  store: SnapshotsInternalStore
): Array<{ meta: SnapshotEntryMeta; markdown: string; path: string }> {
  const out: Array<{ meta: SnapshotEntryMeta; markdown: string; path: string }> = []
  for (const meta of store.entries) {
    const markdown = store.files[meta.fileName]
    if (typeof markdown !== "string") {
      continue
    }
    out.push({ meta, markdown, path: meta.fileName })
  }
  return out
}

export function internalSnapshotFileNames(store: SnapshotsInternalStore): Set<string> {
  return new Set(store.entries.map((e) => e.fileName))
}
