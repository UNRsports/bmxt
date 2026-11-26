import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "close_window" }>

export async function applyCloseWindowEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const ids = e.window_ids.filter((id) => Number.isInteger(id) && id >= 0)
  if (ids.length === 0) {
    return [effectT(ctx, "effect.closeWindow.noTargets")]
  }
  const lines: string[] = []
  for (const windowId of ids) {
    try {
      await chrome.windows.remove(windowId)
      lines.push(effectT(ctx, "effect.closeWindow.done", { windowId: String(windowId) }))
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      lines.push(
        effectT(ctx, "effect.closeWindow.failed", {
          windowId: String(windowId),
          reason
        })
      )
    }
  }
  return lines
}
