import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "open_url_into_window" }>

async function focusCreatedTab(tabId: number, windowId: number): Promise<void> {
  await chrome.tabs.update(tabId, { active: true })
  await chrome.windows.update(windowId, { focused: true })
}

export async function applyOpenUrlIntoWindowEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const windowId = e.window_id
  if (!Number.isFinite(windowId) || windowId < 0) {
    return [effectT(ctx, "effect.openUrlIntoWindow.invalid", { windowId: String(windowId) })]
  }
  try {
    const tab = await chrome.tabs.create({ windowId, url })
    if (tab.id === undefined) {
      return [effectT(ctx, "effect.openUrlIntoWindow.failed", { windowId: String(windowId) })]
    }
    await focusCreatedTab(tab.id, windowId)
    return [
      effectT(ctx, "effect.openUrlIntoWindow.opened", {
        tabId: String(tab.id),
        windowId: String(windowId),
        url
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.openUrlIntoWindow.error", { reason })]
  }
}
