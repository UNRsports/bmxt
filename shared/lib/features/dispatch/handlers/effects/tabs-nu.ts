import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "tabs_nu" }>

export async function applyTabsNuEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  const url = tab?.url
  if (!url) {
    return [effectT(ctx, "effect.tabsNu.noUrl")]
  }
  return [url]
}
