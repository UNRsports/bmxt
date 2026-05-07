import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "open_url_new_tab" }>

export async function applyOpenUrlNewTabEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const t = await chrome.tabs.create({ url: e.url })
  return [`opened new tab ${t.id}: ${e.url}`]
}
