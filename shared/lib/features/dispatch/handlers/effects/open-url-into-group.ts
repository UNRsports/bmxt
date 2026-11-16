import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { parseHttpUrlForEffect } from "../shared"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "open_url_into_group" }>

async function focusCreatedTab(tabId: number, windowId: number): Promise<void> {
  await chrome.tabs.update(tabId, { active: true })
  await chrome.windows.update(windowId, { focused: true })
}

export async function applyOpenUrlIntoGroupEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.openUrl.rejected", { url: e.url })]
  }
  const windowId = e.window_id
  const groupId = e.group_id
  if (!Number.isFinite(windowId) || windowId < 0 || !Number.isFinite(groupId) || groupId < 0) {
    return [
      effectT(ctx, "effect.openUrlIntoGroup.invalid", {
        windowId: String(windowId),
        groupId: String(groupId)
      })
    ]
  }
  try {
    const tab = await chrome.tabs.create({ windowId, url })
    if (tab.id === undefined) {
      return [effectT(ctx, "effect.openUrlIntoGroup.failed", { groupId: String(groupId) })]
    }
    try {
      await chrome.tabs.group({ groupId, tabIds: tab.id })
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      await focusCreatedTab(tab.id, windowId)
      return [effectT(ctx, "effect.openUrlIntoGroup.groupFailed", { reason })]
    }
    await focusCreatedTab(tab.id, windowId)
    return [
      effectT(ctx, "effect.openUrlIntoGroup.opened", {
        tabId: String(tab.id),
        groupId: String(groupId),
        url
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.openUrlIntoGroup.error", { reason })]
  }
}
