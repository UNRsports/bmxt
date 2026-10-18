/** Service worker entry: window launch first; heavy services load on demand. */

import { reinjectContentScriptsIntoOpenTabs } from "../../lib/features/page-scripting/ensure-content-script"
import { openWelcomePageOnUpdateIfNeeded } from "../../lib/features/welcome"
import { loadBackgroundServicesAsync } from "./load-background-services"
import { setupMessageBridge } from "./message-bridge"
import { setupWindowLaunch } from "./window-launch"
import { hydrateBmxtWindowIdFromStorage } from "./window-state"

export default defineBackground(() => {
  setupWindowLaunch()
  setupMessageBridge()

  void loadBackgroundServicesAsync().then((services) => {
    services.registerBackgroundServices()
  })

  chrome.runtime.onInstalled.addListener((details) => {
    void hydrateBmxtWindowIdFromStorage()
    void openWelcomePageOnUpdateIfNeeded(details)
    // EN: Install/update — inject CS into already-open http(s) tabs (no page reload).
    void reinjectContentScriptsIntoOpenTabs()
  })

  chrome.runtime.onStartup.addListener(() => {
    void hydrateBmxtWindowIdFromStorage()
  })
})
