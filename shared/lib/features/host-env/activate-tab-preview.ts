/**
 * EN: Dispatcher — popup vs tab shell preview activation.
 * JA: popup / tab シェルのプレビュー活性化を振り分ける。
 */

import { usesTabShell } from "./resolve-shell-mode.ts"
import { activateTabInBackground as activatePopup } from "./shell/popup/activate-tab-preview.ts"
import { activateTabInBackground as activateTab } from "./shell/tab/activate-tab-preview.ts"

export async function activateTabInBackground(tabId: number): Promise<boolean> {
  if (usesTabShell()) {
    return activateTab(tabId)
  }
  return activatePopup(tabId)
}
