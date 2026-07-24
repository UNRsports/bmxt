import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveTabRefDisplay, tabRefEffectLine } from "./tab-ref-effect-line"

type E = Extract<ChromeEffect, { kind: "tab_reload" }>

export async function applyTabReloadEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const lines: string[] = []
  const ids = e.tab_ids.filter((id) => Number.isInteger(id) && id >= 0)

  if (ids.length === 0) {
    const tab = await ctx.resolveTabArg(undefined)
    if (!tab?.id) {
      return [effectT(ctx, "effect.tabReload.noTarget")]
    }
    const display = await resolveTabRefDisplay(tab)
    try {
      await chrome.tabs.reload(tab.id)
    } catch {
      return [tabRefEffectLine(ctx, "effect.tabReload.failed", display)]
    }
    return [tabRefEffectLine(ctx, "effect.tabReload.done", display)]
  }

  for (const tabId of ids) {
    const display = await resolveTabRefDisplay(tabId)
    try {
      await chrome.tabs.reload(tabId)
      lines.push(tabRefEffectLine(ctx, "effect.tabReload.done", display))
    } catch {
      lines.push(tabRefEffectLine(ctx, "effect.tabReload.failed", display))
    }
  }
  return lines
}
