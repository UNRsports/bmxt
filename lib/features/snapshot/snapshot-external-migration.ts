import { expandDispatchMsgs } from "../bmxt-core/expand-msgs.ts"
import type { UiLocale } from "../setting/locale"
import { migrateSnapshotsInternalToExternal } from "./snapshot-storage"

/** EN: Move internal snapshots to external bundle after storage mode switch. */
export async function migrateSnapshotsToExternalBundleWithLog(
  bundle: FileSystemDirectoryHandle,
  locale: UiLocale
): Promise<string[]> {
  const result = await migrateSnapshotsInternalToExternal(bundle)
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
          key: "cmd.snapshot.migrate.done",
          params: { count: String(result.migrated) }
        }
      ],
      locale
    )
  }
  return []
}
