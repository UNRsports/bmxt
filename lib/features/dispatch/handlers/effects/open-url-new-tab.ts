import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { createTabInNormalBrowserWindow, parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "open_url_new_tab" }>

export async function applyOpenUrlNewTabEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const tab = await createTabInNormalBrowserWindow(url)
  if (!tab) {
    return [effectT(ctx, "effect.openUrlNewTab.failed", { url })]
  }
  return [
    effectT(ctx, "effect.openUrlNewTab.opened", {
      tabId: String(tab.id),
      url
    })
  ]
}
