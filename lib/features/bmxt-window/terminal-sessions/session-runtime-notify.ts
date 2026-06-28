/**
 * EN: SW → UI notifications when UI is not the mutator (reset shortcut, etc.).
 * JA: UI が正本でない通知（リセットショートカット等）のみ SW から送る。
 */

import { SESSION_CLEAR_MESSAGE } from "./session-runtime-protocol"

export function broadcastSessionClearToUi(): void {
  void chrome.runtime.sendMessage({ type: SESSION_CLEAR_MESSAGE })
}
