import type { PickerEntry } from "../side-picker/model/picker-entry"
import { isHttpUrl } from "../url/is-http-url"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import { normalizeUrlForSearchDedup } from "./search-url-dedup"

export type OpenTabResolution = { tabId: number; windowId: number }

/** EN: One `chrome.tabs.query` for many entries (avoids per-row queries). */
export async function listOpenTabsByNormalizedUrl(): Promise<Map<string, OpenTabResolution>> {
  const byUrl = new Map<string, OpenTabResolution>()
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.discarded || tab.id == null || tab.windowId == null || !isHttpUrl(tab.url)) {
      continue
    }
    if (!isScriptablePageUrl(tab.url)) {
      continue
    }
    const key = normalizeUrlForSearchDedup(tab.url)
    if (!byUrl.has(key)) {
      byUrl.set(key, { tabId: tab.id, windowId: tab.windowId })
    }
  }
  return byUrl
}

async function resolveStoredTabId(tabId: number): Promise<OpenTabResolution | null> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (
      !tab.discarded &&
      tab.id != null &&
      tab.windowId != null &&
      isScriptablePageUrl(tab.url)
    ) {
      return { tabId: tab.id, windowId: tab.windowId }
    }
  } catch {
    /* fall through */
  }
  return null
}

/** EN: Resolve an open http(s) tab for this entry (stored tabId or URL match). */
export async function resolveOpenTabForSearchEntry(
  entry: PickerEntry,
  openTabsByUrl?: ReadonlyMap<string, OpenTabResolution>
): Promise<OpenTabResolution | null> {
  if (entry.tabId != null) {
    const stored = await resolveStoredTabId(entry.tabId)
    if (stored) {
      return stored
    }
  }

  const targetKey = normalizeUrlForSearchDedup(entry.url)
  if (openTabsByUrl) {
    return openTabsByUrl.get(targetKey) ?? null
  }

  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.discarded || tab.id == null || tab.windowId == null || !isHttpUrl(tab.url)) {
      continue
    }
    if (normalizeUrlForSearchDedup(tab.url) === targetKey && isScriptablePageUrl(tab.url)) {
      return { tabId: tab.id, windowId: tab.windowId }
    }
  }
  return null
}

/** EN: True when the entry URL is open in a non-discarded scriptable http(s) tab. */
export async function searchEntryHasOpenTab(entry: PickerEntry): Promise<boolean> {
  return (await resolveOpenTabForSearchEntry(entry)) !== null
}
