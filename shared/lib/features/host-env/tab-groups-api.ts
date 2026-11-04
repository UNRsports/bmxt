/**
 * EN: Dispatcher — PC vs SP `tabGroups` implementation.
 * JA: PC / SP の tabGroups 実装を振り分ける。
 */

import { resolveFormFactor } from "./resolve-form-factor.ts"
import * as pc from "./pc/tab-groups-api.ts"
import * as sp from "./sp/tab-groups-api.ts"

function impl() {
  return resolveFormFactor() === "sp" ? sp : pc
}

/** EN: Ungrouped tab sentinel (Chrome `tabGroups.TAB_GROUP_ID_NONE`). */
export const TAB_GROUP_ID_NONE = -1

export function hasTabGroupsApi(): boolean {
  return impl().hasTabGroupsApi()
}

export async function queryTabGroups(
  queryInfo?: chrome.tabGroups.QueryInfo
): Promise<chrome.tabGroups.TabGroup[]> {
  return impl().queryTabGroups(queryInfo)
}

export function addTabGroupsChangeListeners(listener: () => void): () => void {
  return impl().addTabGroupsChangeListeners(listener)
}
