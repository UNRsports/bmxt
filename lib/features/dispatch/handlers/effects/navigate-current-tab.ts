import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "navigate_current_tab" }>

export async function applyNavigateCurrentTabEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [
      "no target tab for current navigation (focus a normal window with a page)"
    ]
  }
  await chrome.tabs.update(tab.id, { url: e.url })
  return [`navigated tab ${tab.id}: ${e.url}`]
}
