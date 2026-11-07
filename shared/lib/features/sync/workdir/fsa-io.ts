import { SYNC_BUNDLE_ROOT_DIR } from "./bundle-layout"
import { loadSyncWorkdirHandle } from "./handle-db"

export function isFileSystemAccessAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function"
  )
}

export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  readWrite: boolean
): Promise<boolean> {
  const mode: FileSystemPermissionMode = readWrite ? "readwrite" : "read"
  if ((await handle.queryPermission({ mode })) === "granted") {
    return true
  }
  if ((await handle.requestPermission({ mode })) === "granted") {
    return true
  }
  return false
}

export async function ensureSyncBundleRoot(
  picked: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle> {
  try {
    const existing = await picked.getDirectoryHandle(SYNC_BUNDLE_ROOT_DIR, { create: false })
    return existing
  } catch {
    /* create below */
  }
  try {
    const marker = await picked.getFileHandle("roster.json", { create: false })
    if (marker) {
      return picked
    }
  } catch {
    /* not a bare sync root */
  }
  return picked.getDirectoryHandle(SYNC_BUNDLE_ROOT_DIR, { create: true })
}

export async function resolveReadableSyncRoot(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadSyncWorkdirHandle()
  if (handle === null) {
    return null
  }
  if (!(await verifyDirectoryPermission(handle, false))) {
    return null
  }
  return ensureSyncBundleRoot(handle)
}

export async function resolveWritableSyncRoot(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadSyncWorkdirHandle()
  if (handle === null) {
    return null
  }
  if (!(await verifyDirectoryPermission(handle, true))) {
    return null
  }
  return ensureSyncBundleRoot(handle)
}

export async function readJsonFile<T>(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<T | null> {
  try {
    const fileHandle = await dir.getFileHandle(name)
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export async function writeJsonFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  value: unknown
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(value, null, 2))
  await writable.close()
}

export async function ensureSubdir(
  root: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create: true })
}

export async function listFileNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = []
  // FileSystemDirectoryHandle async iterator — typed loosely for both Chrome / Firefox.
  const iterable = dir as unknown as AsyncIterable<[string, FileSystemHandle]>
  if (typeof iterable[Symbol.asyncIterator] !== "function") {
    return names
  }
  for await (const [name, handle] of iterable) {
    if (handle.kind === "file") {
      names.push(name)
    }
  }
  return names
}

export async function removeFileIfExists(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<void> {
  try {
    await dir.removeEntry(name)
  } catch {
    /* missing */
  }
}
