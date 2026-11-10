import { groupTabsResilient } from "../../tabs/controller/chrome-tab-groups.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { sanitizeGroupTitle, sanitizeRemoteOpenUrls } from "./remote-open-sanitize.ts"

export { sanitizeGroupTitle, sanitizeRemoteOpenUrls } from "./remote-open-sanitize.ts"

async function createTab(url: string): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.create({ url, active: false })
  } catch {
    return null
  }
}

/**
 * EN: Apply a remote open_tabs command on this browser (local side effect).
 * JA: 受信した open_tabs をこのブラウザで実行する。
 */
export async function applyRemoteOpenTabs(options: {
  urls: string[]
  groupTitle: string | null
  locale: UiLocale
}): Promise<{ ok: boolean; detail: string; openedUrls: string[] }> {
  const urls = sanitizeRemoteOpenUrls(options.urls)
  if (urls.length === 0) {
    return { ok: false, detail: "no_valid_urls", openedUrls: [] }
  }
  const tabIds: number[] = []
  const openedUrls: string[] = []
  for (const url of urls) {
    const tab = await createTab(url)
    if (tab?.id !== undefined) {
      tabIds.push(tab.id)
      openedUrls.push(url)
    }
  }
  if (tabIds.length === 0) {
    return { ok: false, detail: "create_failed", openedUrls: [] }
  }
  const title = sanitizeGroupTitle(options.groupTitle)
  if (title !== null && tabIds.length >= 1) {
    try {
      const groupId = await groupTabsResilient(tabIds, options.locale)
      await chrome.tabGroups.update(groupId, { title })
      return {
        ok: true,
        detail: `opened=${tabIds.length};group=${groupId}`,
        openedUrls
      }
    } catch {
      return {
        ok: true,
        detail: `opened=${tabIds.length};group_failed`,
        openedUrls
      }
    }
  }
  return { ok: true, detail: `opened=${tabIds.length}`, openedUrls }
}
