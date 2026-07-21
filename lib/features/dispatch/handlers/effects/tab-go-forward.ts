import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "tab_go_forward" }>

export async function applyTabGoForwardEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.tabGoForward.noTarget")]
  }
  try {
    await chrome.tabs.goForward(tab.id)
  } catch {
    return [
      effectT(ctx, "effect.tabGoForward.failed", {
        tabId: String(tab.id)
      })
    ]
  }
  return [
    effectT(ctx, "effect.tabGoForward.done", {
      tabId: String(tab.id)
    })
  ]
}
