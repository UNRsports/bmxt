import { usesTabShell } from "../../bmxt-window/shell-launch-mode"
import { markPickerSelfTabActivation } from "./picker-self-tab-activation"

/**
 * EN: Activate a tab without focusing its window (picker background preview).
 *     No-op on Firefox tab shell — the shell is itself a normal tab; activating
 *     another tab would hide BMXt (looks like a black / blank prompt).
 * JA: ウィンドウをフォーカスせずタブをアクティブにする（ピッカーの背面プレビュー）。
 *     Firefox タブシェルではシェル自体が通常タブなので、別タブを active にすると
 *     BMXt が隠れる（プロンプトが真っ黒に見える）。
 */
export async function activateTabInBackground(tabId: number): Promise<boolean> {
  if (usesTabShell()) {
    return false
  }
  try {
    markPickerSelfTabActivation(tabId)
    await chrome.tabs.update(tabId, { active: true })
    return true
  } catch {
    return false
  }
}
