export type SnapshotStorageDestination = "bundled" | "vault"

export type SnapshotStorageConfig = {
  /** EN: `bundled` follows UI settings storage; `vault` uses a separate Obsidian folder. */
  destination: SnapshotStorageDestination
  /** EN: Picked vault root `FileSystemDirectoryHandle.name` when destination is `vault`. */
  vaultDirectoryName: string | null
}

export const DEFAULT_SNAPSHOT_STORAGE_CONFIG: SnapshotStorageConfig = {
  destination: "bundled",
  vaultDirectoryName: null
}

function parseDestination(raw: unknown): SnapshotStorageDestination {
  return raw === "vault" ? "vault" : "bundled"
}

export function normalizeSnapshotStorageConfig(
  raw: Partial<SnapshotStorageConfig> | null | undefined
): SnapshotStorageConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SNAPSHOT_STORAGE_CONFIG }
  }
  return {
    destination: parseDestination(raw.destination),
    vaultDirectoryName: typeof raw.vaultDirectoryName === "string" ? raw.vaultDirectoryName : null
  }
}
