import { WELCOME_PAGE_PATH } from "./welcome-page-path"

/** `tabs/welcome.html` を通常のブラウザタブで開く（install / update / aboutbmxt 共通）。 */
export async function openWelcomePageTab(): Promise<void> {
  await chrome.tabs.create({
    url: chrome.runtime.getURL(WELCOME_PAGE_PATH),
    active: true
  })
}
