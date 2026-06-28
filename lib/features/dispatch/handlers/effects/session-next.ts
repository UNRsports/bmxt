import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "session_next" }>

export async function applySessionNextEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  ctx.enqueueSessionPatch({
    type: "switchNext",
    anchorSessionId: ctx.commandSessionId
  })
  return []
}
