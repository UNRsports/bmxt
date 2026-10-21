import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "navigate_current_tab" }>

export async function applyNavigateCurrentTabEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.navigateTab.noTarget")]
  }
  await chrome.tabs.update(tab.id, { url })
  return [
    effectT(ctx, "effect.navigateTab.done", {
      tabId: String(tab.id),
      url
    })
  ]
}
