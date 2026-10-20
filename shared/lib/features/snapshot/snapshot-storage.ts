import { loadUiSettingsStorageConfig } from "../setting/settings-storage-config"
import { buildSnapshotFileName, uniquifySnapshotFileName } from "./snapshot-filename"
import { buildSnapshotMarkdown } from "./snapshot-markdown"
import {
  clearSnapshotsInternalStore,
  internalSnapshotFileNames,
  listInternalSnapshotDocuments,
  loadSnapshotsInternalStore,
  truncateSnapshotBody,
  writeSnapshotToInternalStore
} from "./snapshot-internal-store"
import {
  getExternalBundleHandleForSnapshots,
  listExternalSnapshotDocuments,
  writeAllSnapshotsToExternalBundle,
  writeSnapshotToExternalDir
} from "./snapshot-external-store"
import { loadSnapshotStorageConfig } from "./snapshot-storage-config"
import {
  listVaultSnapshotDocuments,
  writeAllSnapshotsToVault,
  writeSnapshotToVaultDir
} from "./snapshot-vault-store"
import { getSnapshotVaultDirectoryHandle } from "./snapshot-vault-persistence"
import type {
  SnapshotMigrationResult,
  SnapshotSaveInput,
  SnapshotSaveResult,
  SnapshotEntryMeta
} from "./snapshot-types"

function newSnapshotId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function takenFileNames(): Promise<Set<string>> {
  const snapshotConfig = await loadSnapshotStorageConfig()
  if (snapshotConfig.destination === "vault") {
    const docs = await listVaultSnapshotDocuments()
    if (!docs) {
      return new Set()
    }
    return new Set(docs.map((d) => d.meta.fileName))
  }

  const config = await loadUiSettingsStorageConfig()
  if (config.mode === "external") {
    const docs = await listExternalSnapshotDocuments()
    if (!docs) {
      return new Set()
    }
    return new Set(docs.map((d) => d.meta.fileName))
  }
  const store = await loadSnapshotsInternalStore()
  return internalSnapshotFileNames(store)
}

export async function saveSnapshot(input: SnapshotSaveInput): Promise<SnapshotSaveResult> {
  const savedAt = new Date().toISOString()
  const bodyText = truncateSnapshotBody(input.bodyText)
  const markdown = buildSnapshotMarkdown(
    { title: input.title, url: input.url, bodyText },
    savedAt
  )
  const taken = await takenFileNames()
  const fileName = uniquifySnapshotFileName(
    buildSnapshotFileName(input.title, input.url, savedAt),
    taken
  )
  const meta: SnapshotEntryMeta = {
    id: newSnapshotId(),
    fileName,
    title: input.title.trim() || "(no title)",
    url: input.url.trim(),
    savedAt
  }

  const snapshotConfig = await loadSnapshotStorageConfig()
  if (snapshotConfig.destination === "vault") {
    const vaultRoot = await getSnapshotVaultDirectoryHandle()
    if (!vaultRoot) {
      throw new Error("obsidian vault directory handle missing")
    }
    const path = await writeSnapshotToVaultDir(vaultRoot, fileName, markdown, meta)
    return { ok: true, fileName, path, title: meta.title, url: meta.url }
  }

  const config = await loadUiSettingsStorageConfig()
  if (config.mode === "external") {
    const bundle = await getExternalBundleHandleForSnapshots()
    if (!bundle) {
      throw new Error("external directory handle missing")
    }
    const path = await writeSnapshotToExternalDir(bundle, fileName, markdown, meta)
    return { ok: true, fileName, path, title: meta.title, url: meta.url }
  }

  await writeSnapshotToInternalStore(fileName, markdown, meta)
  return { ok: true, fileName, path: fileName, title: meta.title, url: meta.url }
}

export async function listSnapshotDocumentsForSearch(): Promise<
  Array<{ meta: SnapshotEntryMeta; markdown: string; path: string }>
> {
  const snapshotConfig = await loadSnapshotStorageConfig()
  if (snapshotConfig.destination === "vault") {
    const docs = await listVaultSnapshotDocuments()
    return docs ?? []
  }

  const config = await loadUiSettingsStorageConfig()
  if (config.mode === "external") {
    const docs = await listExternalSnapshotDocuments()
    return docs ?? []
  }
  const store = await loadSnapshotsInternalStore()
  return listInternalSnapshotDocuments(store)
}

export async function migrateSnapshotsInternalToExternal(
  bundle: FileSystemDirectoryHandle
): Promise<SnapshotMigrationResult> {
  const store = await loadSnapshotsInternalStore()
  const docs = listInternalSnapshotDocuments(store)
  if (docs.length === 0) {
    return { ok: true, migrated: 0 }
  }
  try {
    const payload = docs.map((doc) => ({
      fileName: doc.meta.fileName,
      markdown: doc.markdown,
      meta: doc.meta
    }))
    const migrated = await writeAllSnapshotsToExternalBundle(bundle, payload)
    await clearSnapshotsInternalStore()
    return { ok: true, migrated }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

export async function migrateSnapshotsInternalToVault(
  vaultRoot: FileSystemDirectoryHandle
): Promise<SnapshotMigrationResult> {
  const store = await loadSnapshotsInternalStore()
  const docs = listInternalSnapshotDocuments(store)
  if (docs.length === 0) {
    return { ok: true, migrated: 0 }
  }
  try {
    const payload = docs.map((doc) => ({
      fileName: doc.meta.fileName,
      markdown: doc.markdown,
      meta: doc.meta
    }))
    const migrated = await writeAllSnapshotsToVault(vaultRoot, payload)
    await clearSnapshotsInternalStore()
    return { ok: true, migrated }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

export async function countInternalSnapshots(): Promise<number> {
  const store = await loadSnapshotsInternalStore()
  return store.entries.length
}
