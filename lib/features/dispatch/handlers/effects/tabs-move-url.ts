import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { parseHttpUrlForEffect, tabsMoveUrl } from "../shared"

type E = Extract<ChromeEffect, { kind: "tabs_move_url" }>

export async function applyTabsMoveUrlEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const normalized = parseHttpUrlForEffect(e.url)
  if (!normalized) {
    return ["usage: tabs -moveurl <http(s)-url>"]
  }
  return tabsMoveUrl(normalized)
}
