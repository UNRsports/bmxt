import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { createSessionAndActivate } from "../../../bmxt-window/terminal-sessions/state-storage"

type E = Extract<ChromeEffect, { kind: "session_new" }>

export async function applySessionNewEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await createSessionAndActivate(ctx.commandSessionId)
  return []
}
