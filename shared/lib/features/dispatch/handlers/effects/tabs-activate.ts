import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "tabs_activate" }>

export async function applyTabsActivateEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabId = e.tab_id
  if (!Number.isInteger(tabId) || tabId < 0) {
    return [effectT(ctx, "effect.tabsActivate.invalid", { tabId: String(tabId) })]
  }
  // EN: Cross-device activate must run in the UI peer bus — not this SW-local path.
  if (e.device_id.trim().length > 0) {
    return [effectT(ctx, "effect.tabsActivate.remoteRefused", { tabId: String(tabId) })]
  }
  const focusWindow = e.focus === "true"
  try {
    const tab = await chrome.tabs.get(tabId)
    await chrome.tabs.update(tabId, { active: true })
    if (focusWindow && typeof tab.windowId === "number") {
      await chrome.windows.update(tab.windowId, { focused: true })
    }
    return [effectT(ctx, "effect.tabsActivate.done", { tabId: String(tabId) })]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.tabsActivate.failed", { tabId: String(tabId), reason })]
  }
}
