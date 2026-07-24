import { expandDispatchMsgs } from "../bmxt-core/expand-msgs.ts"
import type { UiLocale } from "../setting/locale"
import { migrateSnapshotsInternalToVault } from "./snapshot-storage"

/** EN: Move internal snapshots to the Obsidian vault folder after destination switch. */
export async function migrateSnapshotsToVaultWithLog(
  vaultRoot: FileSystemDirectoryHandle,
  locale: UiLocale
): Promise<string[]> {
  const result = await migrateSnapshotsInternalToVault(vaultRoot)
  if (result.ok === false) {
    return expandDispatchMsgs(
      [{ key: "cmd.snapshot.migrate.failed", params: { message: result.error } }],
      locale
    )
  }
  if (result.migrated > 0) {
    return expandDispatchMsgs(
      [
        {
          key: "cmd.snapshot.migrate.vaultDone",
          params: { count: String(result.migrated) }
        }
      ],
      locale
    )
  }
  return []
}
