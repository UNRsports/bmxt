import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "tabs_nu" }>

export async function applyTabsNuEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  const url = tab?.url
  if (!url) {
    return [effectT(ctx, "effect.tabsNu.noUrl")]
  }
  return [url]
}
