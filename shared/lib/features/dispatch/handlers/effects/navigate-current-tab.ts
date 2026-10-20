import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "navigate_current_tab" }>

export async function applyNavigateCurrentTabEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.navigateTab.noTarget")]
  }
  await chrome.tabs.update(tab.id, { url })
  return [
    effectT(ctx, "effect.navigateTab.done", {
      tabId: String(tab.id),
      url
    })
  ]
}
