import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveTabRefDisplay, tabRefEffectLine } from "./tab-ref-effect-line"

type E = Extract<ChromeEffect, { kind: "tab_go_back" }>

export async function applyTabGoBackEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const lines: string[] = []
  const ids = e.tab_ids.filter((id) => Number.isInteger(id) && id >= 0)

  if (ids.length === 0) {
    const tab = await ctx.resolveTabArg(undefined)
    if (!tab?.id) {
      return [effectT(ctx, "effect.tabGoBack.noTarget")]
    }
    const display = await resolveTabRefDisplay(tab)
    try {
      await chrome.tabs.goBack(tab.id)
    } catch {
      return [tabRefEffectLine(ctx, "effect.tabGoBack.failed", display)]
    }
    return [tabRefEffectLine(ctx, "effect.tabGoBack.done", display)]
  }

  for (const tabId of ids) {
    const display = await resolveTabRefDisplay(tabId)
    try {
      await chrome.tabs.goBack(tabId)
      lines.push(tabRefEffectLine(ctx, "effect.tabGoBack.done", display))
    } catch {
      lines.push(tabRefEffectLine(ctx, "effect.tabGoBack.failed", display))
    }
  }
  return lines
}
