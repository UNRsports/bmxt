import { SNAPSHOT_STORAGE_CONFIG_KEY } from "../extension-storage/keys"
import {
  DEFAULT_SNAPSHOT_STORAGE_CONFIG,
  normalizeSnapshotStorageConfig,
  type SnapshotStorageConfig
} from "./snapshot-storage-mode"

export type { SnapshotStorageConfig, SnapshotStorageDestination } from "./snapshot-storage-mode"
export {
  DEFAULT_SNAPSHOT_STORAGE_CONFIG,
  normalizeSnapshotStorageConfig
} from "./snapshot-storage-mode"

export async function loadSnapshotStorageConfig(): Promise<SnapshotStorageConfig> {
  const r = await chrome.storage.local.get(SNAPSHOT_STORAGE_CONFIG_KEY)
  const raw = r[SNAPSHOT_STORAGE_CONFIG_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SNAPSHOT_STORAGE_CONFIG }
  }
  return normalizeSnapshotStorageConfig(raw as Partial<SnapshotStorageConfig>)
}

export async function saveSnapshotStorageConfig(next: SnapshotStorageConfig): Promise<void> {
  await chrome.storage.local.set({
    [SNAPSHOT_STORAGE_CONFIG_KEY]: normalizeSnapshotStorageConfig(next)
  })
}
