import { isFileSystemAccessAvailable } from "../setting/settings-external-storage"
import {
  clearSnapshotVaultDirectoryHandle,
  loadSnapshotVaultDirectoryHandle,
  saveSnapshotVaultDirectoryHandle
} from "../setting/settings-handle-db"
import {
  saveSnapshotStorageConfig,
  type SnapshotStorageConfig
} from "./snapshot-storage-config"

const VAULT_PICKER_ID = "bmxt-snapshot-vault"

export type PickSnapshotVaultDirectoryResult =
  | { ok: true; handle: FileSystemDirectoryHandle; directoryName: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; error: string; message: string }

async function verifyReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") {
    return true
  }
  if ((await handle.requestPermission({ mode: "readwrite" })) === "granted") {
    return true
  }
  return false
}

export async function pickSnapshotVaultDirectory(): Promise<PickSnapshotVaultDirectoryResult> {
  if (!isFileSystemAccessAvailable()) {
    return {
      ok: false,
      error: "unavailable",
      message: "file system access unavailable"
    }
  }
  try {
    const picked = await window.showDirectoryPicker({
      id: VAULT_PICKER_ID,
      mode: "readwrite"
    })
    const allowed = await verifyReadWritePermission(picked)
    if (!allowed) {
      return {
        ok: false,
        error: "permission_denied",
        message: "directory permission denied"
      }
    }
    return { ok: true, handle: picked, directoryName: picked.name }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, cancelled: true }
    }
    return {
      ok: false,
      error: "read_failed",
      message: e instanceof Error ? e.message : String(e)
    }
  }
}

export async function activateSnapshotVaultStorage(
  handle: FileSystemDirectoryHandle,
  directoryName: string
): Promise<SnapshotStorageConfig> {
  await saveSnapshotVaultDirectoryHandle(handle)
  const config: SnapshotStorageConfig = {
    destination: "vault",
    vaultDirectoryName: directoryName
  }
  await saveSnapshotStorageConfig(config)
  return config
}

export async function activateBundledSnapshotStorage(): Promise<SnapshotStorageConfig> {
  const config: SnapshotStorageConfig = {
    destination: "bundled",
    vaultDirectoryName: null
  }
  await saveSnapshotStorageConfig(config)
  return config
}

export async function repickSnapshotVaultDirectory(): Promise<PickSnapshotVaultDirectoryResult> {
  const picked = await pickSnapshotVaultDirectory()
  if (!picked.ok) {
    return picked
  }
  await saveSnapshotVaultDirectoryHandle(picked.handle)
  await saveSnapshotStorageConfig({
    destination: "vault",
    vaultDirectoryName: picked.directoryName
  })
  return picked
}

export async function getSnapshotVaultDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return loadSnapshotVaultDirectoryHandle()
}

export async function clearSnapshotVaultStorage(): Promise<void> {
  await clearSnapshotVaultDirectoryHandle()
  await activateBundledSnapshotStorage()
}
