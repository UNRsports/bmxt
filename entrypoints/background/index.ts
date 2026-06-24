/** Service worker entry: window launch first; heavy services load on demand. */

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
  })

  chrome.runtime.onStartup.addListener(() => {
    void hydrateBmxtWindowIdFromStorage()
  })
})
