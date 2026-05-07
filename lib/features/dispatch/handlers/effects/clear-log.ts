import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "clear_log" }>

export async function applyClearLogEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await ctx.clearLog()
  return ["(log cleared)"]
}
