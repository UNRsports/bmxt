/**
 * EN: Ensure only one prompt host is live — popup window XOR in-page float(s).
 * JA: プロンプトホストは常に排他（ポップアップ窓 XOR ページ内フロート）。
 */

import { loadPromptLaunchHostAsync } from "./prompt-launch-host.ts"
import {
  hydrateFloatVisibleTabs,
  listFloatDesiredVisibleTabIds
} from "./float-visible-tabs.ts"

/**
 * EN: Hide every float that is (or was) desired-visible, plus any extra tab ids.
 * JA: desired 付きの全フロートと追加タブを隠す。
 */
export async function hideAllFloatHosts(args: {
  hideFloat: (tabId: number) => Promise<void>
  extraTabIds?: readonly number[]
}): Promise<void> {
  await hydrateFloatVisibleTabs()
  const ids = new Set<number>(listFloatDesiredVisibleTabIds())
  for (const raw of args.extraTabIds ?? []) {
    if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) {
      ids.add(raw)
    }
  }
  for (const tabId of ids) {
    await args.hideFloat(tabId)
  }
}

/**
 * EN: True when the preferred launch host is popup (float must not auto-show).
 */
export async function isPopupPreferredPromptHost(): Promise<boolean> {
  const host = await loadPromptLaunchHostAsync()
  return host === "popup"
}

/**
 * EN: Pure check used by unit tests — popup preferred or an open popup window id.
 */
export function shouldSuppressFloatWhilePopupOwnsUi(args: {
  preferredHost: "popup" | "float"
  popupWindowOpen: boolean
}): boolean {
  if (args.preferredHost === "popup") {
    return true
  }
  return args.popupWindowOpen
}
