import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveTabRefDisplay, tabRefEffectLine } from "./tab-ref-effect-line"

type E = Extract<HostEffect, { kind: "close_current_tab" }>

export async function applyCloseCurrentTabEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.closeCurrentTab.noTarget")]
  }
  const tabId = tab.id
  const display = await resolveTabRefDisplay(tab)
  const doneLine = tabRefEffectLine(ctx, "effect.closeCurrentTab.done", display)

  try {
    await chrome.tabs.remove(tabId)
  } catch {
    return [tabRefEffectLine(ctx, "effect.closeCurrentTab.failed", display)]
  }

  return [doneLine]
}
