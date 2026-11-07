/**
 * EN: Chrome offscreen document — WebRTC peer + FSA command-queue drain.
 * JA: Chrome offscreen — WebRTC peer と FSA コマンドキュー消化。
 */
import { getSyncService } from "../../lib/features/sync"

async function tick(): Promise<void> {
  try {
    await getSyncService().status()
  } catch {
    /* ignore */
  }
}

void tick()
setInterval(() => {
  void tick()
}, 4000)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "BMXT_SYNC_OFFSCREEN_PING") {
    return false
  }
  void tick()
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }))
  return true
})
