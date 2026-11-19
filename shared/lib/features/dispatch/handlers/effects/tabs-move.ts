import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "tabs_move" }>

/** EN: `group_id < 0` → move only; `group_id === 0` → ungroup after move; `> 0` → attach. */
export async function applyTabsMoveEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabIds = e.tab_ids.filter((id) => Number.isFinite(id) && id >= 0)
  const windowId = e.window_id
  const groupId = e.group_id
  if (tabIds.length === 0) {
    return [effectT(ctx, "effect.tabsMove.noTabs")]
  }
  if (!Number.isFinite(windowId) || windowId < 0) {
    return [effectT(ctx, "effect.tabsMove.invalidWindow", { windowId: String(windowId) })]
  }
  try {
    await chrome.tabs.move(tabIds, { windowId, index: -1 })
    if (groupId > 0) {
      await chrome.tabs.group({ groupId, tabIds })
    } else if (groupId === 0) {
      await chrome.tabs.ungroup(tabIds)
    }
    return [
      effectT(ctx, "effect.tabsMove.done", {
        count: String(tabIds.length),
        windowId: String(windowId),
        groupId: String(groupId)
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.tabsMove.error", { reason })]
  }
}
