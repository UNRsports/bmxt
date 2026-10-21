import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"

type E = Extract<HostEffect, { kind: "exit_pane" }>

export async function applyExitPaneEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  return ctx.exitPane()
}
