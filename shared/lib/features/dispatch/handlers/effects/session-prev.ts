import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "session_prev" }>

export async function applySessionPrevEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  ctx.enqueueSessionPatch({
    type: "switchPrev",
    anchorSessionId: ctx.commandSessionId
  })
  return []
}
