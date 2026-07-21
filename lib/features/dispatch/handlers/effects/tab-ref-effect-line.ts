import type { EffectMessageKey } from "../../../setting/i18n/ns/effect"
import { encodeTabRefInline } from "../../../command-line/tab-ref-log"
import { resolveTabFaviconSrc } from "../../../tabs/tab-favicon-url"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

export type TabRefDisplay = {
  title: string
  faviconSrc: string | null
}

/** EN: Resolve favicon + title for a tab id or Tab object (never surfaces numeric id). */
export async function resolveTabRefDisplay(
  tabOrId: chrome.tabs.Tab | number
): Promise<TabRefDisplay> {
  let tab: chrome.tabs.Tab | undefined
  if (typeof tabOrId === "number") {
    try {
      tab = await chrome.tabs.get(tabOrId)
    } catch {
      tab = undefined
    }
  } else {
    tab = tabOrId
  }
  const title = (tab?.title ?? "").trim() || "(no title)"
  const url = typeof tab?.url === "string" ? tab.url : ""
  return {
    title,
    faviconSrc: resolveTabFaviconSrc(url)
  }
}

/** EN: Effect log line with plain favicon+title (no chip chrome) in place of `{tab}`. */
export function tabRefEffectLine(
  ctx: DispatchChromeContext,
  key: EffectMessageKey,
  display: TabRefDisplay
): string {
  return effectT(ctx, key, {
    tab: encodeTabRefInline({
      title: display.title,
      faviconSrc: display.faviconSrc,
      appearance: "plain"
    })
  })
}
