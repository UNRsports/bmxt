/**
 * EN: Start version-upgrade storage read before React mounts (avoid queueing behind SW warm).
 * JA: React マウント前に storage 読込を開始（SW warm より先にキュー投入）。
 */

import { LAST_SEEN_EXTENSION_VERSION_KEY } from "../extension-storage/keys"

let preflightPromise: Promise<Record<string, unknown>> | undefined

export function startVersionUpgradePreflight(): void {
  if (preflightPromise) {
    return
  }
  preflightPromise = new Promise((resolve) => {
    try {
      chrome.storage.local.get(LAST_SEEN_EXTENSION_VERSION_KEY, (stored) => {
        if (chrome.runtime.lastError) {
          resolve({})
          return
        }
        resolve(stored)
      })
    } catch {
      resolve({})
    }
  })
}

export function readVersionUpgradePreflightAsync(): Promise<Record<string, unknown>> {
  startVersionUpgradePreflight()
  return preflightPromise!
}

export function resetVersionUpgradePreflightForTests(): void {
  preflightPromise = undefined
}
