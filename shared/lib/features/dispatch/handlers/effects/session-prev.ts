import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"

type E = Extract<HostEffect, { kind: "session_prev" }>

export async function applySessionPrevEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  ctx.enqueueSessionPatch({
    type: "switchPrev",
    anchorSessionId: ctx.commandSessionId
  })
  return []
}
