import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { splitColForLeaf } from "../../../bmxt-window/terminal-sessions/state-storage"

type E = Extract<ChromeEffect, { kind: "split_col" }>

export async function applySplitColEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await splitColForLeaf(ctx.commandSessionId)
  return []
}
