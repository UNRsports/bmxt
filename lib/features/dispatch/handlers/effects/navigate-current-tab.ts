import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "navigate_current_tab" }>

export async function applyNavigateCurrentTabEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.navigateTab.noTarget")]
  }
  await chrome.tabs.update(tab.id, { url: e.url })
  return [
    effectT(ctx, "effect.navigateTab.done", {
      tabId: String(tab.id),
      url: e.url
    })
  ]
}
