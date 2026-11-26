import {
  callChromeTabGroupsUpdate,
  groupTabsResilient
} from "../../../tabs/controller/chrome-tab-groups"
import { NEW_GROUP_COLORS } from "../../../tabs/tab-picker-overlay-constants"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "group_new" }>

const ALLOWED_COLORS = new Set<string>(NEW_GROUP_COLORS)

export async function applyGroupNewEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const tabIds = e.tab_ids.filter((id) => Number.isInteger(id) && id >= 0)
  if (tabIds.length === 0) {
    return [effectT(ctx, "effect.groupNew.noTabs")]
  }
  const locale = ctx.uiLocale ?? getRunLocale()
  const groupId = await groupTabsResilient(tabIds, locale)
  const title = typeof e.title === "string" ? e.title.trim() : ""
  const colorRaw = typeof e.color === "string" ? e.color.trim() : ""
  const update: chrome.tabGroups.UpdateProperties = {}
  if (title.length > 0) {
    update.title = title
  }
  if (colorRaw.length > 0 && ALLOWED_COLORS.has(colorRaw)) {
    update.color = colorRaw as chrome.tabGroups.UpdateProperties["color"]
  }
  if (Object.keys(update).length > 0) {
    try {
      await callChromeTabGroupsUpdate(groupId, update)
    } catch {
      return [
        effectT(ctx, "effect.groupNew.done", { groupId: String(groupId) }),
        effectT(ctx, "effect.groupNew.metaFailed", { groupId: String(groupId) })
      ]
    }
  }
  return [effectT(ctx, "effect.groupNew.done", { groupId: String(groupId) })]
}
