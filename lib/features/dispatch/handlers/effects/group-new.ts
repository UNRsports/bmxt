import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "group_new" }>

export async function applyGroupNewEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const groupId = await chrome.tabs.group({ tabIds: e.tab_ids })
  return [`created group ${groupId}`]
}
