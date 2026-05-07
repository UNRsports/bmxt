import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "tabs_nu" }>

export async function applyTabsNuEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  const u = tab?.url
  if (!u) {
    return [
      "(no URL for current tab — focus a normal window with a page, or pass a tab id context)"
    ]
  }
  return [u]
}
