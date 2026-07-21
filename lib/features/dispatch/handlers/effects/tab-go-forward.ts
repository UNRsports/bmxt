import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveTabRefDisplay, tabRefEffectLine } from "./tab-ref-effect-line"

type E = Extract<ChromeEffect, { kind: "tab_go_forward" }>

export async function applyTabGoForwardEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.tabGoForward.noTarget")]
  }
  const display = await resolveTabRefDisplay(tab)
  try {
    await chrome.tabs.goForward(tab.id)
  } catch {
    return [tabRefEffectLine(ctx, "effect.tabGoForward.failed", display)]
  }
  return [tabRefEffectLine(ctx, "effect.tabGoForward.done", display)]
}
