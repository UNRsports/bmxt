import { SNAPSHOTS_INDEX_JSON_NAME } from "./snapshot-bundle-layout"
import {
  SNAPSHOT_VAULT_ROOT_DIR,
  SNAPSHOT_VAULT_SNAPSHOTS_DIR,
  snapshotVaultRelativePath
} from "./snapshot-vault-layout"
import { getSnapshotVaultDirectoryHandle } from "./snapshot-vault-persistence"
import type { SnapshotEntryMeta, SnapshotsIndexJson } from "./snapshot-types"

async function verifyReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if ((await handle.queryPermission({ mode: "read" })) === "granted") {
    return true
  }
  if ((await handle.requestPermission({ mode: "read" })) === "granted") {
    return true
  }
  return false
}

async function verifyReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") {
    return true
  }
  if ((await handle.requestPermission({ mode: "readwrite" })) === "granted") {
    return true
  }
  return false
}

export async function resolveVaultSnapshotsDir(
  vaultRoot: FileSystemDirectoryHandle,
  create: boolean
): Promise<FileSystemDirectoryHandle> {
  const bmxtDir = await vaultRoot.getDirectoryHandle(SNAPSHOT_VAULT_ROOT_DIR, { create })
  return bmxtDir.getDirectoryHandle(SNAPSHOT_VAULT_SNAPSHOTS_DIR, { create })
}

function parseIndexJson(raw: unknown): SnapshotsIndexJson {
  if (!raw || typeof raw !== "object") {
    return { version: 1, entries: [] }
  }
  const o = raw as Partial<SnapshotsIndexJson>
  if (o.version !== 1 || !Array.isArray(o.entries)) {
    return { version: 1, entries: [] }
  }
  const entries: SnapshotEntryMeta[] = []
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
  return { version: 1, entries }
}

async function readFileText(dir: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    const fileHandle = await dir.getFileHandle(name)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

async function writeFileText(
  dir: FileSystemDirectoryHandle,
  name: string,
  text: string
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(text)
  await writable.close()
}

async function loadVaultSnapshotsIndex(
  snapshotsDir: FileSystemDirectoryHandle
): Promise<SnapshotsIndexJson> {
  const text = await readFileText(snapshotsDir, SNAPSHOTS_INDEX_JSON_NAME)
  if (!text) {
    return { version: 1, entries: [] }
  }
  try {
    return parseIndexJson(JSON.parse(text))
  } catch {
    return { version: 1, entries: [] }
  }
}

async function saveVaultSnapshotsIndex(
  snapshotsDir: FileSystemDirectoryHandle,
  index: SnapshotsIndexJson
): Promise<void> {
  const text = `${JSON.stringify(index, null, 2)}\n`
  await writeFileText(snapshotsDir, SNAPSHOTS_INDEX_JSON_NAME, text)
}

export async function writeSnapshotToVaultDir(
  vaultRoot: FileSystemDirectoryHandle,
  fileName: string,
  markdown: string,
  meta: SnapshotEntryMeta
): Promise<string> {
  const allowed = await verifyReadWritePermission(vaultRoot)
  if (!allowed) {
    throw new Error("permission denied")
  }
  const snapshotsDir = await resolveVaultSnapshotsDir(vaultRoot, true)
  await writeFileText(snapshotsDir, fileName, markdown)
  const index = await loadVaultSnapshotsIndex(snapshotsDir)
  const withoutDup = index.entries.filter((e) => e.fileName !== fileName)
  const entries = [meta, ...withoutDup]
  await saveVaultSnapshotsIndex(snapshotsDir, { version: 1, entries })
  return snapshotVaultRelativePath(fileName)
}

export async function listVaultSnapshotDocuments(): Promise<
  Array<{ meta: SnapshotEntryMeta; markdown: string; path: string }> | null
> {
  const vaultRoot = await getSnapshotVaultDirectoryHandle()
  if (!vaultRoot) {
    return null
  }
  const allowed = await verifyReadPermission(vaultRoot)
  if (!allowed) {
    return null
  }
  let snapshotsDir: FileSystemDirectoryHandle
  try {
    snapshotsDir = await resolveVaultSnapshotsDir(vaultRoot, false)
  } catch {
    return []
  }
  const index = await loadVaultSnapshotsIndex(snapshotsDir)
  const out: Array<{ meta: SnapshotEntryMeta; markdown: string; path: string }> = []
  for (const meta of index.entries) {
    const markdown = await readFileText(snapshotsDir, meta.fileName)
    if (markdown === null) {
      continue
    }
    out.push({
      meta,
      markdown,
      path: snapshotVaultRelativePath(meta.fileName)
    })
  }
  return out
}

export async function writeAllSnapshotsToVault(
  vaultRoot: FileSystemDirectoryHandle,
  docs: Array<{ fileName: string; markdown: string; meta: SnapshotEntryMeta }>
): Promise<number> {
  const allowed = await verifyReadWritePermission(vaultRoot)
  if (!allowed) {
    throw new Error("permission denied")
  }
  const snapshotsDir = await resolveVaultSnapshotsDir(vaultRoot, true)
  const entries: SnapshotEntryMeta[] = []
  for (const doc of docs) {
    await writeFileText(snapshotsDir, doc.fileName, doc.markdown)
    entries.push(doc.meta)
  }
  entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  await saveVaultSnapshotsIndex(snapshotsDir, { version: 1, entries })
  return docs.length
}
