/**
 * 複数の Effect ハンドラで共有する URL 正規化と tabs -moveurl 相当のジャンプ。
 */

import { BMXT_WINDOW_ID_KEY, LAST_NORMAL_WINDOW_KEY } from "../../extension-storage/keys"
import { tEffect } from "../../setting/i18n/ns/effect"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { UiLocale } from "../../setting/locale"
import { parseOpenHttpUrl } from "../../url/parse-open-http-url.ts"

export async function tabsMoveUrl(
  normalized: string,
  locale: UiLocale = getRunLocale()
): Promise<string[]> {
  const tabs = await chrome.tabs.query({})
  const httpTabs = tabs.filter(
    (tab) =>
      tab.id !== undefined &&
      tab.url &&
      (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
  )
  const exact = httpTabs.find((tab) => tab.url === normalized)
  const byOpenedPrefix = httpTabs.find((tab) => tab.url!.startsWith(normalized))
  const byTypedPrefix = httpTabs.find((tab) => {
    const tabUrl = tab.url!
    if (!normalized.startsWith(tabUrl)) {
      return false
    }
    if (normalized.length === tabUrl.length) {
      return true
    }
    const next = normalized[tabUrl.length]
    return next === "/" || next === "?" || next === "#"
  })
  const pick = exact ?? byOpenedPrefix ?? byTypedPrefix
  if (pick?.id !== undefined) {
    await chrome.tabs.update(pick.id, { active: true })
    if (pick.windowId !== undefined) {
      await chrome.windows.update(pick.windowId, { focused: true })
    }
    return [
      tEffect("effect.openTab.activated", locale, {
        tabId: String(pick.id),
        url: pick.url ?? ""
      })
    ]
  }
  const created = await createTabInNormalBrowserWindow(normalized)
  if (!created) {
    return [tEffect("effect.openTab.openFailed", locale, { url: normalized })]
  }
  return [
    tEffect("effect.openTab.openedNew", locale, {
      tabId: String(created.id ?? "?"),
      url: normalized
    })
  ]
}

export function parseHttpUrlForEffect(urlStr: string): string | null {
  return parseOpenHttpUrl(urlStr)
}

/** EN: Prefer last focused normal browser window — never the BMXt shell window. */
export async function resolveNormalBrowserWindowId(): Promise<number | undefined> {
  try {
    const r = await chrome.storage.local.get([LAST_NORMAL_WINDOW_KEY, BMXT_WINDOW_ID_KEY])
    const lastNormal = r[LAST_NORMAL_WINDOW_KEY] as number | undefined
    const bmxtWin = r[BMXT_WINDOW_ID_KEY] as number | undefined
    if (typeof lastNormal === "number" && lastNormal !== bmxtWin) {
      const win = await chrome.windows.get(lastNormal)
      if (win.type === "normal" && win.id !== undefined) {
        return win.id
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] })
    if (win.id === undefined || win.type !== "normal") {
      return undefined
    }
    const r = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
    const bmxtWin = r[BMXT_WINDOW_ID_KEY] as number | undefined
    if (win.id === bmxtWin) {
      return undefined
    }
    return win.id
  } catch {
    return undefined
  }
}

/** EN: Open a tab in a normal browser window (not the BMXt extension window). */
export async function createTabInNormalBrowserWindow(url: string): Promise<chrome.tabs.Tab | null> {
  const windowId = await resolveNormalBrowserWindowId()
  try {
    return await chrome.tabs.create(windowId !== undefined ? { url, windowId } : { url })
  } catch {
    try {
      return await chrome.tabs.create({ url })
    } catch {
      return null
    }
  }
}
