import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "session_new" }>

export async function applySessionNewEffect(
  ctx: DispatchChromeContext,
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
