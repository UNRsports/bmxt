import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "tabs_new_window" }>

export async function applyTabsNewWindowEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabIds = e.tab_ids.filter((id) => Number.isFinite(id) && id >= 0)
  if (tabIds.length === 0) {
    return [effectT(ctx, "effect.tabsNewWindow.noTabs")]
  }
  try {
    const tabs = await Promise.all(tabIds.map((id) => chrome.tabs.get(id)))
    const ordered = tabs
      .filter((t): t is chrome.tabs.Tab & { id: number } => t.id !== undefined)
      .sort((a, b) => {
        const wa = a.windowId ?? 0
        const wb = b.windowId ?? 0
        if (wa !== wb) {
          return wa - wb
        }
        return (a.index ?? 0) - (b.index ?? 0)
      })
      .map((t) => t.id)
    const first = ordered[0]
    if (first === undefined) {
      return [effectT(ctx, "effect.tabsNewWindow.noTabs")]
    }
    const rest = ordered.slice(1)
    const created = await chrome.windows.create({ tabId: first, focused: true })
    const newWinId = created.id
    if (newWinId === undefined) {
      return [effectT(ctx, "effect.tabsNewWindow.failed")]
    }
    if (rest.length > 0) {
      await chrome.tabs.move(rest, { windowId: newWinId, index: -1 })
    }
    return [
      effectT(ctx, "effect.tabsNewWindow.done", {
        windowId: String(newWinId),
        count: String(ordered.length)
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.tabsNewWindow.error", { reason })]
  }
}
