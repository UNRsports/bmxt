import { groupTabsResilient } from "../../tabs/controller/chrome-tab-groups.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { NewGroupPaletteColor } from "../../tabs/tab-picker-overlay-constants.ts"
import {
  sanitizeGroupColor,
  sanitizeGroupTitle,
  sanitizeRemoteOpenUrls
} from "./remote-open-sanitize.ts"

export {
  sanitizeGroupColor,
  sanitizeGroupTitle,
  sanitizeRemoteOpenUrls
} from "./remote-open-sanitize.ts"

async function createTab(url: string, windowId: number | null): Promise<chrome.tabs.Tab | null> {
  try {
    if (windowId !== null) {
      return await chrome.tabs.create({ url, windowId, active: false })
    }
    return await chrome.tabs.create({ url, active: false })
  } catch {
    if (windowId === null) {
      return null
    }
    // EN: Fall back when the peer window id is stale.
    try {
      return await chrome.tabs.create({ url, active: false })
    } catch {
      return null
    }
  }
}

/**
 * EN: Apply a remote open_tabs command on this browser (local side effect).
 *     Groups when title and/or color is present (untitled source groups send color only).
 * JA: 受信した open_tabs をこのブラウザで実行する。
 *     title または color があればグループ化（無題グループは color のみ送る）。
 */
export async function applyRemoteOpenTabs(options: {
  urls: string[]
  groupTitle: string | null
  groupColor?: string | null
  locale: UiLocale
  windowId?: number | null
}): Promise<{ ok: boolean; detail: string; openedUrls: string[] }> {
  const urls = sanitizeRemoteOpenUrls(options.urls)
  if (urls.length === 0) {
    return { ok: false, detail: "no_valid_urls", openedUrls: [] }
  }
  const windowId =
    typeof options.windowId === "number" && Number.isFinite(options.windowId)
      ? options.windowId
      : null
  const tabIds: number[] = []
  const openedUrls: string[] = []
  for (const url of urls) {
    const tab = await createTab(url, windowId)
    if (tab?.id !== undefined) {
      tabIds.push(tab.id)
      openedUrls.push(url)
    }
  }
  if (tabIds.length === 0) {
    return { ok: false, detail: "create_failed", openedUrls: [] }
  }
  const title = sanitizeGroupTitle(options.groupTitle)
  const color = sanitizeGroupColor(options.groupColor ?? null)
  if ((title !== null || color !== null) && tabIds.length >= 1) {
    try {
      const groupId = await groupTabsResilient(tabIds, options.locale)
      const update: chrome.tabGroups.UpdateProperties = {}
      if (title !== null) {
        update.title = title
      }
      if (color !== null) {
        update.color = color as chrome.tabGroups.UpdateProperties["color"]
      }
      if (Object.keys(update).length > 0) {
        await chrome.tabGroups.update(groupId, update)
      }
      // EN: Detail is machine-oriented for peers/logs; do not surface groupId in UI copy.
      // JA: detail はピア／ログ向け。UI 文言に groupId を出さない。
      const colorPart: NewGroupPaletteColor | "none" = color ?? "none"
      return {
        ok: true,
        detail: `opened=${tabIds.length};grouped;color=${colorPart}`,
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
