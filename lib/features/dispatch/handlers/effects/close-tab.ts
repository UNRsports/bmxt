import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "close_tab" }>

export async function applyCloseTabEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  await chrome.tabs.remove(e.tab_id)
  return [`closed tab ${e.tab_id}`]
}
