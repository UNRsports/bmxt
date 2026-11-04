/**
 * EN: Safe `chrome.tabGroups` access — API is missing on Firefox for Android.
 *     Chrome documents `TAB_GROUP_ID_NONE` as `-1`.
 * JA: Android では tabGroups が無い。未所属グループ ID は Chrome と同じ -1。
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
