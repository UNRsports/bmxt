/**
 * EN: Move tabs as one contiguous block while preserving current visual order.
 * JA: 現在のタブバー表示順を保ったまま、連続ブロックとして移動する。
 *
 * When some of the tabs already sit before `index` in the destination window,
 * a naive `chrome.tabs.move(ids, { index })` lands past the intended slot.
 * Subtract those tabs from the destination index before the batch move.
 */

export async function moveTabsContiguous(
  tabIds: readonly number[],
  windowId: number,
  index: number
): Promise<number[]> {
  if (tabIds.length === 0) {
    return []
  }
  if (!Number.isFinite(windowId) || windowId < 0) {
    return []
  }

  const infos: { id: number; index: number; windowId: number }[] = []
  for (const id of tabIds) {
    if (!Number.isFinite(id) || id < 0) {
      continue
    }
    try {
      const tab = await chrome.tabs.get(id)
      infos.push({
        id,
        index: typeof tab.index === "number" ? tab.index : 0,
        windowId: typeof tab.windowId === "number" ? tab.windowId : -1
      })
    } catch {
      // EN: Skip tabs that disappeared between selection and move.
    }
  }
  if (infos.length === 0) {
    return []
  }

  infos.sort((a, b) => {
    if (a.windowId !== b.windowId) {
      return a.windowId - b.windowId
    }
    return a.index - b.index
  })
  const orderedIds = infos.map((t) => t.id)

  let destIndex = index
  if (Number.isFinite(destIndex) && destIndex >= 0) {
    let beforeCount = 0
    for (const t of infos) {
      if (t.windowId === windowId && t.index < destIndex) {
        beforeCount += 1
      }
    }
    destIndex = Math.max(0, destIndex - beforeCount)
  } else {
    destIndex = -1
  }

  await chrome.tabs.move(orderedIds, { windowId, index: destIndex })
  return orderedIds
}
