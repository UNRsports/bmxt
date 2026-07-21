import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveTabRefDisplay, tabRefEffectLine } from "./tab-ref-effect-line"

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
  const display = await resolveTabRefDisplay(tab)
  try {
    await chrome.tabs.remove(tabId)
  } catch {
    return [tabRefEffectLine(ctx, "effect.closeCurrentTab.failed", display)]
  }
  return [tabRefEffectLine(ctx, "effect.closeCurrentTab.done", display)]
}
