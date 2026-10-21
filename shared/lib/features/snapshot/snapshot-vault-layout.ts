/** EN: Root folder created inside the user-picked Obsidian vault for BMXt snapshots. */
export const SNAPSHOT_VAULT_ROOT_DIR = "BMXt"

/** EN: Snapshots live under `<vault>/BMXt/snapshots/`. */
export const SNAPSHOT_VAULT_SNAPSHOTS_DIR = "snapshots"

export function snapshotVaultRelativePath(fileName: string): string {
  return `${SNAPSHOT_VAULT_ROOT_DIR}/${SNAPSHOT_VAULT_SNAPSHOTS_DIR}/${fileName}`
}

export function formatSnapshotVaultDisplayName(vaultDirectoryName: string): string {
  return `${vaultDirectoryName}/${SNAPSHOT_VAULT_ROOT_DIR}/${SNAPSHOT_VAULT_SNAPSHOTS_DIR}`
}
