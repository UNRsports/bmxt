/**
 * EN: Popup shell — activate a tab for picker background preview.
 * JA: ポップアップシェル — ピッカー背面プレビュー用にタブをアクティブにする。
 */

import { markPickerSelfTabActivation } from "../../../side-picker/preview/picker-self-tab-activation.ts"

export async function activateTabInBackground(tabId: number): Promise<boolean> {
  try {
    markPickerSelfTabActivation(tabId)
    await chrome.tabs.update(tabId, { active: true })
    return true
  } catch {
    return false
  }
}
