/**
 * EN: PC — `chrome.tabGroups` access (guarded if the namespace is absent).
 * JA: PC — tabGroups を使う（ネームスペース欠落時はガード）。
 */

/** EN: Ungrouped tab sentinel (Chrome `tabGroups.TAB_GROUP_ID_NONE`). */
export const TAB_GROUP_ID_NONE = -1

export function hasTabGroupsApi(): boolean {
  return typeof chrome !== "undefined" && chrome.tabGroups !== undefined
}

export async function queryTabGroups(
  queryInfo?: chrome.tabGroups.QueryInfo
): Promise<chrome.tabGroups.TabGroup[]> {
  if (!hasTabGroupsApi()) {
    return []
  }
  return chrome.tabGroups.query(queryInfo ?? {})
}

export function addTabGroupsChangeListeners(listener: () => void): () => void {
  if (!hasTabGroupsApi()) {
    return () => {
      /* no-op */
    }
  }
  chrome.tabGroups.onCreated.addListener(listener)
  chrome.tabGroups.onUpdated.addListener(listener)
  chrome.tabGroups.onRemoved.addListener(listener)
  chrome.tabGroups.onMoved.addListener(listener)
  return () => {
    chrome.tabGroups.onCreated.removeListener(listener)
    chrome.tabGroups.onUpdated.removeListener(listener)
    chrome.tabGroups.onRemoved.removeListener(listener)
    chrome.tabGroups.onMoved.removeListener(listener)
  }
}
