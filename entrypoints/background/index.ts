/** Service worker entry: fast window launch first, heavy services lazy-loaded. */

import { scheduleDeferredWarmSearchCaches } from "../../lib/features/launch/warm-search-scheduler"
import { loadBackgroundServicesAsync } from "./load-background-services"
import { setupMessageBridge } from "./message-bridge"
import { setupWindowLaunch } from "./window-launch"

export default defineBackground(() => {
  setupWindowLaunch()
  setupMessageBridge()
  scheduleDeferredWarmSearchCaches()
  void loadBackgroundServicesAsync().then((m) => m.registerBackgroundServices())
})
