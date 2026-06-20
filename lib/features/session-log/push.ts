import type { SessionLogMessage } from "./messages"
import { isSessionLogServiceWorkerContext } from "./context"

/** EN: Broadcast log deltas to BMXt UI extension pages (SW origin only). */
export function pushSessionLogMessage(message: SessionLogMessage): void {
  if (!isSessionLogServiceWorkerContext()) {
    return
  }
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return
  }
  void chrome.runtime.sendMessage(message).catch(() => {
    /* BMXt tab may be closed */
  })
}
