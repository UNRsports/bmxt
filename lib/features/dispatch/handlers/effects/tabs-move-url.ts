import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { tCmd } from "../../../setting/i18n/ns/cmd"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { parseHttpUrlForEffect, tabsMoveUrl } from "../shared"

type E = Extract<ChromeEffect, { kind: "tabs_move_url" }>

export async function applyTabsMoveUrlEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const normalized = parseHttpUrlForEffect(e.url)
  if (!normalized) {
    return [tCmd("cmd.tabs.error.usageMoveurl", ctx.uiLocale ?? getRunLocale())]
  }
  return tabsMoveUrl(normalized, ctx.uiLocale)
}
