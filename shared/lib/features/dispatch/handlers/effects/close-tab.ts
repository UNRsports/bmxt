import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "close_tab" }>

export async function applyCloseTabEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  await chrome.tabs.remove(e.tab_id)
  return [effectT(ctx, "effect.closeTab.done", { tabId: String(e.tab_id) })]
}
