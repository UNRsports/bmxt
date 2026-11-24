import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "tabs_move" }>

/**
 * EN: Resolve insert index. `before_tab_id >= 0` → that tab's current index; else end (`-1`).
 * JA: 挿入 index。`before_tab_id >= 0` ならそのタブの現在位置、それ以外は末尾（`-1`）。
 */
async function resolveMoveIndex(
  windowId: number,
  beforeTabId: number
): Promise<{ windowId: number; index: number }> {
  if (!Number.isFinite(beforeTabId) || beforeTabId < 0) {
    return { windowId, index: -1 }
  }
  try {
    const dest = await chrome.tabs.get(beforeTabId)
    const index = typeof dest.index === "number" ? dest.index : -1
    const destWindowId =
      typeof dest.windowId === "number" && dest.windowId >= 0 ? dest.windowId : windowId
    return { windowId: destWindowId, index }
  } catch {
    return { windowId, index: -1 }
  }
}

/** EN: `group_id < 0` → move only; `group_id === 0` → ungroup after move; `> 0` → attach. */
export async function applyTabsMoveEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabIds = e.tab_ids.filter((id) => Number.isFinite(id) && id >= 0)
  const windowId = e.window_id
  const groupId = e.group_id
  const beforeTabId = e.before_tab_id
  if (tabIds.length === 0) {
    return [effectT(ctx, "effect.tabsMove.noTabs")]
  }
  if (!Number.isFinite(windowId) || windowId < 0) {
    return [effectT(ctx, "effect.tabsMove.invalidWindow", { windowId: String(windowId) })]
  }
  try {
    const moveIds =
      Number.isFinite(beforeTabId) && beforeTabId >= 0
        ? tabIds.filter((id) => id !== beforeTabId)
        : tabIds
    if (moveIds.length === 0) {
      return [effectT(ctx, "effect.tabsMove.noTabs")]
    }
    const resolved = await resolveMoveIndex(windowId, beforeTabId)
    await chrome.tabs.move(moveIds, {
      windowId: resolved.windowId,
      index: resolved.index
    })
    if (groupId > 0) {
      await chrome.tabs.group({ groupId, tabIds: moveIds })
    } else if (groupId === 0) {
      await chrome.tabs.ungroup(moveIds)
    }
    return [
      effectT(ctx, "effect.tabsMove.done", {
        count: String(moveIds.length),
        windowId: String(resolved.windowId),
        groupId: String(groupId)
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.tabsMove.error", { reason })]
  }
}
