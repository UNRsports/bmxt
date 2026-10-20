import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "open_url_new_window" }>

export async function applyOpenUrlNewWindowEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const w = await chrome.windows.create({ url })
  return [
    effectT(ctx, "effect.openUrlNewWindow.opened", {
      windowId: String(w.id),
      url
    })
  ]
}
