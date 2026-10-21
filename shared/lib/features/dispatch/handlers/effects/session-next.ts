import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"

type E = Extract<HostEffect, { kind: "session_next" }>

export async function applySessionNextEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  ctx.enqueueSessionPatch({
    type: "switchNext",
    anchorSessionId: ctx.commandSessionId
  })
  return []
}
