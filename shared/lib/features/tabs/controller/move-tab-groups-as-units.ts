/**
 * EN: Move whole tab groups to a window via sequential `chrome.tabGroups.move`
 *     (one group id per Chrome call), then return which selected tabs were covered.
 * JA: `chrome.tabGroups.move` をグループ ID ごとに逐次呼び出し、ウィンドウへ単位移動する。
 *     選択タブのうちグループで運ばれた ID を返す。
 */

export async function moveTabGroupsAsUnits(params: {
  groupIds: readonly number[]
  windowId: number
  index?: number
}): Promise<{ movedTabIds: Set<number> }> {
  const movedTabIds = new Set<number>()
  const index = params.index ?? -1
  const windowId = params.windowId
  if (!Number.isFinite(windowId) || windowId < 0) {
    return { movedTabIds }
  }
  for (const rawGid of params.groupIds) {
    if (!Number.isFinite(rawGid) || rawGid < 0) {
      continue
    }
    const gid = rawGid
    const tabsInGroup = await chrome.tabs.query({ groupId: gid })
    for (const t of tabsInGroup) {
      if (t.id !== undefined) {
        movedTabIds.add(t.id)
      }
    }
    await chrome.tabGroups.move(gid, { windowId, index })
  }
  return { movedTabIds }
}

export function filterTabIdsNotInSet(
  tabIds: readonly number[],
  movedTabIds: ReadonlySet<number>
): number[] {
  return tabIds.filter((id) => !movedTabIds.has(id))
}
