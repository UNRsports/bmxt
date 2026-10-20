import { LAST_SEEN_WELCOME_VERSION_KEY } from "../extension-storage/keys"
import { openWelcomePageTab } from "./open-welcome-page-tab"
import { shouldOpenWelcomePageOnUpdate } from "./should-open-welcome-on-update"

/**
 * インストールまたは拡張機能更新後、当該バージョンで未表示なら welcome を通常タブで開く。
 */
export async function openWelcomePageOnUpdateIfNeeded(
  details: chrome.runtime.InstalledDetails
): Promise<void> {
  const version = chrome.runtime.getManifest().version
  const r = await chrome.storage.local.get(LAST_SEEN_WELCOME_VERSION_KEY)
  const lastShown = r[LAST_SEEN_WELCOME_VERSION_KEY] as string | undefined
  if (
    !shouldOpenWelcomePageOnUpdate(
      details.reason as "install" | "update" | "chrome_update",
      version,
      lastShown
    )
  ) {
    return
  }

  await openWelcomePageTab()
  await chrome.storage.local.set({ [LAST_SEEN_WELCOME_VERSION_KEY]: version })
}
