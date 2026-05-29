import { LAST_SEEN_WELCOME_VERSION_KEY } from "../extension-storage/keys"
import { shouldOpenWelcomePageOnUpdate } from "./should-open-welcome-on-update"

const WELCOME_PAGE_PATH = "tabs/welcome.html"

/**
 * 拡張機能アップデート後の初回だけ、拡張機能内 welcome ページを通常タブで開く。
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

  await chrome.tabs.create({
    url: chrome.runtime.getURL(WELCOME_PAGE_PATH),
    active: true
  })
  await chrome.storage.local.set({ [LAST_SEEN_WELCOME_VERSION_KEY]: version })
}
