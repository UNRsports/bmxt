/**
 * EN: SP (Fenix) — `tabGroups` missing; empty / no-op.
 * JA: SP（Fenix）— tabGroups なし。空／no-op。
 */

/** EN: Ungrouped tab sentinel (same as Chrome `-1`). */
export const TAB_GROUP_ID_NONE = -1

export function hasTabGroupsApi(): boolean {
  return false
}

export async function queryTabGroups(
  _queryInfo?: chrome.tabGroups.QueryInfo
): Promise<chrome.tabGroups.TabGroup[]> {
  return []
}

export function addTabGroupsChangeListeners(_listener: () => void): () => void {
  return () => {
    /* no-op */
  }
}
