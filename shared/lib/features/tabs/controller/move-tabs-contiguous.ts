/**
 * EN: Move tabs as one contiguous block while preserving current visual order.
 * JA: 現在のタブバー表示順を保ったまま、連続ブロックとして移動する。
 *
 * Chrome and Firefox both accept `tabs.move(number|number[], { windowId?, index })`
 * (MDN / Chromium tabs.json). With `windowId` set and multiple ids, the first tab
 * lands at `index` and the rest follow in array order.
 *
 * Same-window “insert before tab X” is unreliable as a single batch when some
 * movers already sit before X (index accounting differs). Cross-browser recipe:
 * 1) stage the ordered ids at end of the destination window (`index: -1`);
 * 2) re-read `beforeTabId` (or apply beforeCount to a snapshot index);
 * 3) batch-move to that fresh index.
 *
 * If the batch returns an empty array (Firefox pinned/illegal placement) or
 * throws, fall back to sequential single-id moves matching Firefox’s own loop
 * (first at index, then index+1, …).
 */

export type MoveTabsContiguousOptions = {
  /**
   * EN: Preferred insert anchor. After staging at end, its live `index` is used.
   * JA: 挿入アンカー。末尾ステージ後にライブな `index` を使う。
   */
  beforeTabId?: number
}

type TabStripInfo = { id: number; index: number; windowId: number }

async function resolveOrderedTabs(
  tabIds: readonly number[]
): Promise<TabStripInfo[]> {
  const infos: TabStripInfo[] = []
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
  infos.sort((a, b) => {
    if (a.windowId !== b.windowId) {
      return a.windowId - b.windowId
    }
    return a.index - b.index
  })
  return infos
}

function countMoversBeforeIndex(
  infos: readonly TabStripInfo[],
  windowId: number,
  index: number
): number {
  let beforeCount = 0
  for (const t of infos) {
    if (t.windowId === windowId && t.index < index) {
      beforeCount += 1
    }
  }
  return beforeCount
}

/**
 * EN: True when the API reported that nothing moved (Firefox silent pinned fail).
 * JA: 何も動かなかった報告（Firefox のピン制約での空配列）なら真。
 */
function moveResultEmpty(
  result: chrome.tabs.Tab | chrome.tabs.Tab[] | undefined
): boolean {
  if (result === undefined) {
    return false
  }
  if (Array.isArray(result)) {
    return result.length === 0
  }
  return false
}

async function moveTabsSequential(
  orderedIds: readonly number[],
  windowId: number,
  index: number
): Promise<void> {
  let insertionPoint = index
  for (const id of orderedIds) {
    await chrome.tabs.move(id, { windowId, index: insertionPoint })
    // EN: MDN — with windowId, first tab goes to index; subsequent tabs follow.
    // JA: MDN — windowId 指定時は先頭が index、以降が続く。
    if (Number.isFinite(insertionPoint) && insertionPoint >= 0) {
      insertionPoint += 1
    }
  }
}

async function moveTabsBatchOrSequential(
  orderedIds: readonly number[],
  windowId: number,
  index: number
): Promise<void> {
  if (orderedIds.length === 0) {
    return
  }
  if (orderedIds.length === 1) {
    const only = orderedIds[0]
    if (only === undefined) {
      return
    }
    await chrome.tabs.move(only, { windowId, index })
    return
  }

  try {
    const result = await chrome.tabs.move([...orderedIds], { windowId, index })
    if (moveResultEmpty(result)) {
      await moveTabsSequential(orderedIds, windowId, index)
    }
  } catch {
    await moveTabsSequential(orderedIds, windowId, index)
  }
}

async function resolveTargetIndexAfterStaging(
  infos: readonly TabStripInfo[],
  windowId: number,
  snapshotIndex: number,
  beforeTabId: number | undefined
): Promise<number> {
  if (
    beforeTabId !== undefined &&
    Number.isFinite(beforeTabId) &&
    beforeTabId >= 0
  ) {
    try {
      const before = await chrome.tabs.get(beforeTabId)
      if (typeof before.index === "number" && before.index >= 0) {
        return before.index
      }
    } catch {
      // EN: Fall through to snapshot adjustment.
    }
  }
  const beforeCount = countMoversBeforeIndex(infos, windowId, snapshotIndex)
  return Math.max(0, snapshotIndex - beforeCount)
}

export async function moveTabsContiguous(
  tabIds: readonly number[],
  windowId: number,
  index: number,
  options?: MoveTabsContiguousOptions
): Promise<number[]> {
  if (tabIds.length === 0) {
    return []
  }
  if (!Number.isFinite(windowId) || windowId < 0) {
    return []
  }

  const infos = await resolveOrderedTabs(tabIds)
  if (infos.length === 0) {
    return []
  }
  const orderedIds = infos.map((t) => t.id)

  // EN: End-of-window — one batch is enough on both browsers.
  if (!Number.isFinite(index) || index < 0) {
    await moveTabsBatchOrSequential(orderedIds, windowId, -1)
    return orderedIds
  }

  // EN: Stage at end so the insert anchor’s index is stable across engines.
  // JA: 末尾へ一旦集め、挿入アンカーの index をエンジン差なく安定させる。
  await moveTabsBatchOrSequential(orderedIds, windowId, -1)

  const targetIndex = await resolveTargetIndexAfterStaging(
    infos,
    windowId,
    index,
    options?.beforeTabId
  )
  await moveTabsBatchOrSequential(orderedIds, windowId, targetIndex)
  return orderedIds
}
