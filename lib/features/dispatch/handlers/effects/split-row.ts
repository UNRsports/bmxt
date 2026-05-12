import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { splitRowForLeaf } from "../../../bmxt-window/terminal-sessions/state-storage"

type E = Extract<ChromeEffect, { kind: "split_row" }>

export async function applySplitRowEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await splitRowForLeaf(ctx.commandSessionId)
  return []
}
