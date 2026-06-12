import type { PickerEntry } from "../side-picker/model/picker-entry"
import { isHttpUrl } from "../url/is-http-url"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import { normalizeUrlForSearchDedup } from "./search-url-dedup"

/** EN: Resolve an open http(s) tab for this entry (stored tabId or URL match). */
export async function resolveOpenTabForSearchEntry(
  entry: PickerEntry
): Promise<{ tabId: number; windowId: number } | null> {
  if (entry.tabId != null) {
    try {
      const tab = await chrome.tabs.get(entry.tabId)
      if (
        !tab.discarded &&
        tab.id != null &&
        tab.windowId != null &&
        isScriptablePageUrl(tab.url)
      ) {
        return { tabId: tab.id, windowId: tab.windowId }
      }
    } catch {
      /* fall through to URL lookup */
    }
  }

  const targetKey = normalizeUrlForSearchDedup(entry.url)
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
