import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { expandDispatchMsgs } from "../../../bmxt-core/expand-msgs"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { parseHttpUrlForEffect, tabsMoveUrl } from "../shared"

type E = Extract<ChromeEffect, { kind: "tabs_move_url" }>

export async function applyTabsMoveUrlEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const normalized = parseHttpUrlForEffect(e.url)
  if (!normalized) {
    return expandDispatchMsgs(
      [{ key: "cmd.tabs.error.usageMoveurl" }],
      ctx.uiLocale ?? getRunLocale()
    )
  }
  return tabsMoveUrl(normalized, ctx.uiLocale)
}
