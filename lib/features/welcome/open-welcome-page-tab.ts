import { loadUiSettings } from "../setting/settings"
import { buildWelcomePageUrl } from "./welcome-external-url"

/** GitHub Pages の welcome.html を通常のブラウザタブで開く（install / update / aboutbmxt 共通）。 */
export async function openWelcomePageTab(): Promise<void> {
  const settings = await loadUiSettings()
  await chrome.tabs.create({
    url: buildWelcomePageUrl(settings.locale),
    active: true
  })
}
