import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "clear_log" }>

export async function applyClearLogEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  await ctx.clearLog()
  return [effectT(ctx, "effect.clearLog.done")]
}
