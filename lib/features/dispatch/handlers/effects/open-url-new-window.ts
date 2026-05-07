import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "open_url_new_window" }>

export async function applyOpenUrlNewWindowEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const w = await chrome.windows.create({ url: e.url })
  return [`opened new window ${w.id}: ${e.url}`]
}
