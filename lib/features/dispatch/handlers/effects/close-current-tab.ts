import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "close_current_tab" }>

export async function applyCloseCurrentTabEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.closeCurrentTab.noTarget")]
  }
  const tabId = tab.id
  try {
    await chrome.tabs.remove(tabId)
  } catch {
    return [
      effectT(ctx, "effect.closeCurrentTab.failed", {
        tabId: String(tabId)
      })
    ]
  }
  return [
    effectT(ctx, "effect.closeCurrentTab.done", {
      tabId: String(tabId)
    })
  ]
}
