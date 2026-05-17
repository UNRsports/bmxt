import { resolveTargetTabForActiveWindow } from "../page-dom/resolve-target-tab"

/**
 * EN: Target tab for `dom -list` — tabs picker focused tab row when the tabs column is
 *     open and hi is on a tab; otherwise the active tab of the last-focused normal window.
 * JA: `dom -list` の対象タブ — tabs 列が開いていて hi がタブ行のときはその tabId、
 *     それ以外は最後にフォーカスした通常ウィンドウのアクティブタブ。
 */
export async function resolveDomListTargetTabId(
  tabsPickerFocusTabId: number | null,
  tabPickerOpen: boolean
): Promise<number | undefined> {
  if (tabPickerOpen && tabsPickerFocusTabId !== null) {
    return tabsPickerFocusTabId
  }
  const tab = await resolveTargetTabForActiveWindow()
  return tab?.id
}
