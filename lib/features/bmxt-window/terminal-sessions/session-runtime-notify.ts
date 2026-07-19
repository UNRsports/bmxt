/**
 * EN: SW → UI notifications when UI is not the mutator (reset shortcut, etc.).
 * JA: UI が正本でない通知（リセットショートカット等）のみ SW から送る。
 */

import type { BmxtSessionClearHost } from "../bmxt-host-kind"
import { SESSION_CLEAR_MESSAGE } from "./session-runtime-protocol"

export function broadcastSessionClearToUi(host: BmxtSessionClearHost): void {
  void chrome.runtime.sendMessage({ type: SESSION_CLEAR_MESSAGE, host })
}
