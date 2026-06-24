import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "group_new" }>

export async function applyGroupNewEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const groupId = await chrome.tabs.group({ tabIds: e.tab_ids })
  return [effectT(ctx, "effect.groupNew.done", { groupId: String(groupId) })]
}
