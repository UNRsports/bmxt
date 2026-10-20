import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { createTabInNormalBrowserWindow, parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "open_url_new_tab" }>

export async function applyOpenUrlNewTabEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const tab = await createTabInNormalBrowserWindow(url)
  if (!tab) {
    return [effectT(ctx, "effect.openUrlNewTab.failed", { url })]
  }
  return [
    effectT(ctx, "effect.openUrlNewTab.opened", {
      tabId: String(tab.id),
      url
    })
  ]
}
