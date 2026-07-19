/**
 * EN: Which tabs should keep the in-page float prompt visible across navigations.
 * JA: ページ遷移後もフロートを再表示すべきタブ集合。
 */

import { FLOAT_VISIBLE_TAB_IDS_KEY } from "../extension-storage/keys.ts"

const visibleTabIds = new Set<number>()
let hydrated = false

function normalizeTabId(tabId: number): number | null {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return null
  }
  return tabId
}

async function persistVisibleTabs(): Promise<void> {
  try {
    await chrome.storage.session.set({
      [FLOAT_VISIBLE_TAB_IDS_KEY]: [...visibleTabIds]
    })
  } catch {
    /* ignore */
  }
}

export async function hydrateFloatVisibleTabs(): Promise<void> {
  if (hydrated) {
    return
  }
  hydrated = true
  try {
    const raw = await chrome.storage.session.get(FLOAT_VISIBLE_TAB_IDS_KEY)
    const list = raw[FLOAT_VISIBLE_TAB_IDS_KEY]
    if (!Array.isArray(list)) {
      return
    }
    for (const item of list) {
      if (typeof item === "number" && Number.isInteger(item) && item >= 0) {
        visibleTabIds.add(item)
      }
    }
  } catch {
    /* ignore */
  }
}

export function isFloatDesiredVisibleOnTab(tabId: number): boolean {
  const id = normalizeTabId(tabId)
  if (id === null) {
    return false
  }
  return visibleTabIds.has(id)
}

export async function setFloatDesiredVisibleOnTab(
  tabId: number,
  visible: boolean
): Promise<void> {
  const id = normalizeTabId(tabId)
  if (id === null) {
    return
  }
  await hydrateFloatVisibleTabs()
  if (visible) {
    visibleTabIds.add(id)
  } else {
    visibleTabIds.delete(id)
  }
  await persistVisibleTabs()
}

export async function clearFloatDesiredVisibleOnTab(tabId: number): Promise<void> {
  await setFloatDesiredVisibleOnTab(tabId, false)
}

export function listFloatDesiredVisibleTabIds(): number[] {
  return [...visibleTabIds]
}
