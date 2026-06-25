import { resolveTargetTabForActiveWindow } from "../page-dom/resolve-target-tab"
import { getTabPickerEngine } from "../tabs/engine/store"
import { isHttpUrl } from "../url/is-http-url"

export type SnapshotTabResolveContext = {
  sessionId?: string
}

function isScriptableTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab & { id: number } {
  if (!tab || tab.id === undefined) {
    return false
  }
  return isHttpUrl(tab.url ?? "")
}

async function tabById(tabId: number): Promise<chrome.tabs.Tab | undefined> {
  try {
    return await chrome.tabs.get(tabId)
  } catch {
    return undefined
  }
}

function pickerActiveTabId(sessionId: string | undefined): number | undefined {
  if (!sessionId) {
    return undefined
  }
  const engine = getTabPickerEngine(sessionId)
  const activeId = engine?.getState().activeTabId
  if (typeof activeId === "number" && Number.isFinite(activeId)) {
    return activeId
  }
  return undefined
}

async function findRecentHttpTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({})
  const candidates = tabs.filter(
    (t) => !t.discarded && typeof t.id === "number" && isHttpUrl(t.url ?? "")
  )
  candidates.sort((a, b) => {
    const la = (a as { lastAccessed?: number }).lastAccessed ?? 0
    const lb = (b as { lastAccessed?: number }).lastAccessed ?? 0
    return lb - la
  })
  return candidates[0]
}

/**
 * EN: Resolve snapshot target without tabId — picker preview tab, then last normal window,
 *     then most recently accessed http(s) tab (BMXt popup must not win via lastFocusedWindow).
 */
export async function resolveSnapshotTargetTab(
  tabIdRaw: string | undefined,
  ctx: SnapshotTabResolveContext = {}
): Promise<chrome.tabs.Tab | null> {
  if (tabIdRaw !== undefined && tabIdRaw.trim().length > 0) {
    const tabId = Number.parseInt(tabIdRaw.trim(), 10)
    if (!Number.isFinite(tabId)) {
      return null
    }
    const tab = await tabById(tabId)
    return tab ?? null
  }

  const pickerId = pickerActiveTabId(ctx.sessionId)
  if (pickerId !== undefined) {
    const pickerTab = await tabById(pickerId)
    if (isScriptableTab(pickerTab)) {
      return pickerTab
    }
  }

  const normalActive = await resolveTargetTabForActiveWindow()
  if (isScriptableTab(normalActive)) {
    return normalActive
  }

  const recent = await findRecentHttpTab()
  if (isScriptableTab(recent)) {
    return recent
  }

  if (normalActive) {
    return normalActive
  }
  if (pickerId !== undefined) {
    const pickerTab = await tabById(pickerId)
    if (pickerTab) {
      return pickerTab
    }
  }
  return recent ?? null
}
