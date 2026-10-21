import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"

type E = Extract<HostEffect, { kind: "session_new" }>

export async function applySessionNewEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const explicit = e.name.trim()
  ctx.enqueueSessionPatch({
    type: "createSession",
    fromSessionId: ctx.commandSessionId,
    name: explicit.length > 0 ? explicit : undefined
  })
  return []
}
