import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { moveTabsContiguous } from "../../../tabs/controller/move-tabs-contiguous"
import {
  filterTabIdsNotInSet,
  moveTabGroupsAsUnits
} from "../../../tabs/controller/move-tab-groups-as-units"
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

function sanitizeIds(ids: readonly number[]): number[] {
  return ids.filter((id) => Number.isFinite(id) && id >= 0)
}

/**
 * EN: `group_id < 0` → move only; `group_id === 0` → ungroup after move; `> 0` → attach.
 *     `group_ids` (source units) applies only for window-end moves without dest group/ungroup/before-tab.
 * JA: `group_ids`（移動元単位）はウィンドウ末尾移動かつ宛先グループ／ungroup／before-tab なしのときのみ。
 */
export async function applyTabsMoveEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabIds = sanitizeIds(e.tab_ids)
  const windowId = e.window_id
  const groupId = e.group_id
  const beforeTabId = e.before_tab_id
  const sourceGroupIds = sanitizeIds(e.group_ids ?? [])
  if (tabIds.length === 0 && sourceGroupIds.length === 0) {
    return [effectT(ctx, "effect.tabsMove.noTabs")]
  }
  if (!Number.isFinite(windowId) || windowId < 0) {
    return [effectT(ctx, "effect.tabsMove.invalidWindow", { windowId: String(windowId) })]
  }
  try {
    const useGroupUnits =
      sourceGroupIds.length > 0 &&
      !(Number.isFinite(beforeTabId) && beforeTabId >= 0) &&
      !(groupId > 0) &&
      groupId !== 0

    if (useGroupUnits) {
      const { movedTabIds } = await moveTabGroupsAsUnits({
        groupIds: sourceGroupIds,
        windowId,
        index: -1
      })
      const rest = filterTabIdsNotInSet(tabIds, movedTabIds)
      if (rest.length > 0) {
        await moveTabsContiguous(rest, windowId, -1)
      }
      const movedCount = movedTabIds.size + rest.length
      return [
        effectT(ctx, "effect.tabsMove.done", {
          count: String(movedCount),
          windowId: String(windowId),
          groupId: String(groupId)
        })
      ]
    }

    const moveIds =
      Number.isFinite(beforeTabId) && beforeTabId >= 0
        ? tabIds.filter((id) => id !== beforeTabId)
        : tabIds
    if (moveIds.length === 0) {
      return [effectT(ctx, "effect.tabsMove.noTabs")]
    }
    const resolved = await resolveMoveIndex(windowId, beforeTabId)
    const orderedMoved = await moveTabsContiguous(
      moveIds,
      resolved.windowId,
      resolved.index,
      Number.isFinite(beforeTabId) && beforeTabId >= 0
        ? { beforeTabId }
        : undefined
    )
    if (orderedMoved.length === 0) {
      return [effectT(ctx, "effect.tabsMove.noTabs")]
    }
    if (groupId > 0) {
      await chrome.tabs.group({ groupId, tabIds: orderedMoved })
    } else if (groupId === 0) {
      await chrome.tabs.ungroup(orderedMoved)
    }
    return [
      effectT(ctx, "effect.tabsMove.done", {
        count: String(orderedMoved.length),
        windowId: String(resolved.windowId),
        groupId: String(groupId)
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.tabsMove.error", { reason })]
  }
}
