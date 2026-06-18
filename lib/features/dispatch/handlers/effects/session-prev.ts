import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { switchSessionPrev } from "../../../bmxt-window/terminal-sessions/state-storage"

type E = Extract<ChromeEffect, { kind: "session_prev" }>

export async function applySessionPrevEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await switchSessionPrev(ctx.commandSessionId)
  return []
}
