import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "open_url_new_window" }>

export async function applyOpenUrlNewWindowEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const w = await chrome.windows.create({ url: e.url })
  return [
    effectT(ctx, "effect.openUrlNewWindow.opened", {
      windowId: String(w.id),
      url: e.url
    })
  ]
}
