import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { createTabInNormalBrowserWindow } from "../shared"

type E = Extract<ChromeEffect, { kind: "open_url_new_tab" }>

export async function applyOpenUrlNewTabEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const t = await createTabInNormalBrowserWindow(e.url)
  if (!t) {
    return [`error: could not open new tab for ${e.url}`]
  }
  return [`opened new tab ${t.id}: ${e.url}`]
}
