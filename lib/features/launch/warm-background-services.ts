/**
 * EN: Page-side warmup — load background-services.js before the prompt is interactive.
 * JA: プロンプト表示前に background-services.js を SW 側で読み込む。
 */

import { markPageBootPhase } from "./page-boot-perf"

export type WarmBackgroundResponse = { ok: true } | { ok: false; error?: string }

let warmInFlight: Promise<void> | null = null

function warmBackgroundServicesOnce(): Promise<void> {
  markPageBootPhase("warm-background-start")
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "WARM_BACKGROUND" }, (response: WarmBackgroundResponse) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      if (response && typeof response === "object" && "ok" in response && response.ok === false) {
        const msg =
          "error" in response && typeof response.error === "string"
            ? response.error
            : "warm background failed"
        reject(new Error(msg))
        return
      }
      markPageBootPhase("warm-background-done")
      resolve()
    })
  })
}

export function warmBackgroundServicesFromPageAsync(): Promise<void> {
  if (warmInFlight) {
    return warmInFlight
  }
  warmInFlight = warmBackgroundServicesOnce().catch((error) => {
    warmInFlight = null
    throw error
  })
  return warmInFlight
}
