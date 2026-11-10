/**
 * EN: After remote open, close only local tabs whose URLs were successfully opened.
 * JA: リモート open 成功 URL に対応するローカルタブだけ閉じる。
 */

export type LocalOpenSource = {
  url: string
  tabId: number | null
}

/**
 * EN: Map opened URLs back to local tab ids (first unused match per URL, order preserved).
 * JA: 成功 URL をローカル tabId に対応付ける（同一 URL は先勝ち）。
 */
export function tabIdsForOpenedUrls(
  sources: readonly LocalOpenSource[],
  openedUrls: readonly string[]
): number[] {
  const remaining = new Map<string, number[]>()
  for (const source of sources) {
    if (source.tabId === null) {
      continue
    }
    const list = remaining.get(source.url)
    if (list !== undefined) {
      list.push(source.tabId)
    } else {
      remaining.set(source.url, [source.tabId])
    }
  }
  const out: number[] = []
  const seen = new Set<number>()
  for (const url of openedUrls) {
    const list = remaining.get(url)
    if (list === undefined || list.length === 0) {
      continue
    }
    const tabId = list.shift()!
    if (!seen.has(tabId)) {
      seen.add(tabId)
      out.push(tabId)
    }
  }
  return out
}

export async function closeLocalTabsByIds(tabIds: readonly number[]): Promise<number> {
  if (tabIds.length === 0) {
    return 0
  }
  try {
    await chrome.tabs.remove([...tabIds])
    return tabIds.length
  } catch {
    let closed = 0
    for (const tabId of tabIds) {
      try {
        await chrome.tabs.remove(tabId)
        closed += 1
      } catch {
        /* ignore per-tab failure */
      }
    }
    return closed
  }
}

/**
 * EN: Look up one local tab id per URL (lowest id) for bare `sync -open … --close`.
 * JA: 素の CLI `--close` 用に URL ごと最低 id のローカルタブを探す。
 */
export async function resolveLocalTabIdsByUrls(
  urls: readonly string[]
): Promise<LocalOpenSource[]> {
  const tabs = await chrome.tabs.query({})
  const byUrl = new Map<string, number>()
  for (const tab of tabs) {
    if (tab.id === undefined || typeof tab.url !== "string" || tab.url.length === 0) {
      continue
    }
    const existing = byUrl.get(tab.url)
    if (existing === undefined || tab.id < existing) {
      byUrl.set(tab.url, tab.id)
    }
  }
  return urls.map((url) => ({
    url,
    tabId: byUrl.get(url) ?? null
  }))
}
