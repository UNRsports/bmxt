import type { UiLocale } from "../setting/locale"
import { tCmd } from "../setting/i18n/ns/cmd"
import { migrateSnapshotsInternalToExternal } from "./snapshot-storage"

/** EN: Move internal snapshots to external bundle after storage mode switch. */
export async function migrateSnapshotsToExternalBundleWithLog(
  bundle: FileSystemDirectoryHandle,
  locale: UiLocale
): Promise<string[]> {
  const result = await migrateSnapshotsInternalToExternal(bundle)
  if (result.ok === false) {
    return [tCmd("cmd.snapshot.migrate.failed", locale, { message: result.error })]
  }
  if (result.migrated > 0) {
    return [tCmd("cmd.snapshot.migrate.done", locale, { count: String(result.migrated) })]
  }
  return []
}
