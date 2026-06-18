import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { switchSessionNext } from "../../../bmxt-window/terminal-sessions/state-storage"

type E = Extract<ChromeEffect, { kind: "session_next" }>

export async function applySessionNextEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await switchSessionNext(ctx.commandSessionId)
  return []
}
