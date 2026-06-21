import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { parseHttpUrlForEffect, tabsMoveUrl } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "tabs_move_url" }>

export async function applyTabsMoveUrlEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const normalized = parseHttpUrlForEffect(e.url)
  if (!normalized) {
    return [effectT(ctx, "cmd.tabs.error.usageMoveurl")]
  }
  return tabsMoveUrl(normalized, ctx.uiLocale)
}
