import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "exit_pane" }>

export async function applyExitPaneEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  return ctx.exitPane()
}
