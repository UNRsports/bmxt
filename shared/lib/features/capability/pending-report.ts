/**
 * EN: Pending flag — show capability report on next prompt-window open after install/update.
 * JA: 要表示フラグ。install/update 後、次のプロンプト窓オープンで能力レポートを出す。
 */

import { CAPABILITY_REPORT_PENDING_KEY } from "../extension-storage/keys.ts"

/** EN: Mark that the next BMXt prompt open should print the capability report. */
export async function markCapabilityReportPending(): Promise<void> {
  await chrome.storage.local.set({ [CAPABILITY_REPORT_PENDING_KEY]: true })
}

/** EN: Read-and-clear the pending flag. Returns true when a report should be shown. */
export async function consumeCapabilityReportPending(): Promise<boolean> {
  const r = await chrome.storage.local.get(CAPABILITY_REPORT_PENDING_KEY)
  const pending = r[CAPABILITY_REPORT_PENDING_KEY] === true
  if (!pending) {
    return false
  }
  await chrome.storage.local.remove(CAPABILITY_REPORT_PENDING_KEY)
  return true
}
