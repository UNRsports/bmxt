/**
 * EN: Resolve the "target tab" the same way as background `resolveTabArg(undefined)`:
 *     prefer the active tab of the last focused normal window (persisted by background),
 *     fall back to `chrome.windows.getLastFocused({populate:true})` when that window is normal.
 * JA: background の `resolveTabArg(undefined)` と同じロジックでターゲットタブを解決する。
 *     永続化された「最後にフォーカスした通常ウィンドウ」のアクティブタブを優先し、
 *     なければ `getLastFocused` の結果が通常ウィンドウのときのアクティブタブを返す。
 *
 *     This duplicates the background logic on purpose: the picker-direct dispatch path
 *     (`grep -list`, `dom -list`) bypasses the SW `RUN_CMD` round-trip, so handlers cannot
 *     rely on `DispatchChromeContext.resolveTabArg` being populated.
 *     background のロジックを意図的に再実装する：picker 直結ディスパッチ経路
 *     （`grep -list` / `dom -list`）は SW の `RUN_CMD` を経由しないため、handler 側からは
 *     `DispatchChromeContext.resolveTabArg` が stub のまま渡る。
 */

import { LAST_NORMAL_WINDOW_KEY } from "../extension-storage/keys"

export async function resolveTargetTabForActiveWindow(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const r = await chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY)
    const wId = r[LAST_NORMAL_WINDOW_KEY] as number | undefined
    if (typeof wId === "number" && Number.isInteger(wId)) {
      const tabs = await chrome.tabs.query({ windowId: wId, active: true })
      if (tabs[0]) {
        return tabs[0]
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const win = await chrome.windows.getLastFocused({ populate: true })
    if (win.type === "normal" && win.tabs?.length) {
      return win.tabs.find((t) => t.active) ?? win.tabs[0]
    }
  } catch {
    /* swallow */
  }
  return undefined
}
