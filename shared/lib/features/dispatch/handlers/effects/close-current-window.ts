import { BMXT_WINDOW_ID_KEY } from "../../../extension-storage/keys"
import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "close_current_window" }>

export async function applyCloseCurrentWindowEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab || tab.windowId === undefined) {
    return [effectT(ctx, "effect.closeCurrentWindow.noTarget")]
  }
  const windowId = tab.windowId
  try {
    const stored = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
    const bmxtWin = stored[BMXT_WINDOW_ID_KEY] as number | undefined
    if (typeof bmxtWin === "number" && bmxtWin === windowId) {
      return [effectT(ctx, "effect.closeCurrentWindow.rejectedBmxt")]
    }
  } catch {
    /* continue — still attempt close if storage read fails */
  }
  try {
    const win = await chrome.windows.get(windowId)
    if (win.type !== "normal") {
      return [
        effectT(ctx, "effect.closeCurrentWindow.rejectedType", {
          windowId: String(windowId)
        })
      ]
    }
    await chrome.windows.remove(windowId)
  } catch {
    return [
      effectT(ctx, "effect.closeCurrentWindow.failed", {
        windowId: String(windowId)
      })
    ]
  }
  return [
    effectT(ctx, "effect.closeCurrentWindow.done", {
      windowId: String(windowId)
    })
  ]
}
