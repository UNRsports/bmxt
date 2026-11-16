import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "group_add" }>

export async function applyGroupAddEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabIds = e.tab_ids.filter((id) => Number.isFinite(id) && id >= 0)
  const groupId = e.group_id
  if (tabIds.length === 0) {
    return [effectT(ctx, "effect.groupAdd.noTabs")]
  }
  if (!Number.isFinite(groupId) || groupId < 0) {
    return [effectT(ctx, "effect.groupAdd.invalidGroup", { groupId: String(groupId) })]
  }
  try {
    const group = await chrome.tabGroups.get(groupId)
    const windowId = group.windowId
    if (windowId !== undefined) {
      await chrome.tabs.move(tabIds, { windowId, index: -1 })
    }
    await chrome.tabs.group({ groupId, tabIds })
    return [
      effectT(ctx, "effect.groupAdd.done", {
        groupId: String(groupId),
        count: String(tabIds.length)
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.groupAdd.error", { reason })]
  }
}
