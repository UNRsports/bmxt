import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "close_tab" }>

export async function applyCloseTabEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  await chrome.tabs.remove(e.tab_id)
  return [effectT(ctx, "effect.closeTab.done", { tabId: String(e.tab_id) })]
}
