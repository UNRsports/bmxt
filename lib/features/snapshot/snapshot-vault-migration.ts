import type { UiLocale } from "../setting/locale"
import { tCmd } from "../setting/i18n/ns/cmd"
import { migrateSnapshotsInternalToVault } from "./snapshot-storage"

/** EN: Move internal snapshots to the Obsidian vault folder after destination switch. */
export async function migrateSnapshotsToVaultWithLog(
  vaultRoot: FileSystemDirectoryHandle,
  locale: UiLocale
): Promise<string[]> {
  const result = await migrateSnapshotsInternalToVault(vaultRoot)
  if (result.ok === false) {
    return [tCmd("cmd.snapshot.migrate.failed", locale, { message: result.error })]
  }
  if (result.migrated > 0) {
    return [tCmd("cmd.snapshot.migrate.vaultDone", locale, { count: String(result.migrated) })]
  }
  return []
}
