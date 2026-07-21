import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "tab_go_back" }>

export async function applyTabGoBackEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.tabGoBack.noTarget")]
  }
  try {
    await chrome.tabs.goBack(tab.id)
  } catch {
    return [
      effectT(ctx, "effect.tabGoBack.failed", {
        tabId: String(tab.id)
      })
    ]
  }
  return [
    effectT(ctx, "effect.tabGoBack.done", {
      tabId: String(tab.id)
    })
  ]
}
