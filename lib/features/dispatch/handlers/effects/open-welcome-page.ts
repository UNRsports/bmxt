import { WELCOME_PAGE_PATH } from "../../../welcome/welcome-page-path"
import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "open_welcome_page" }>

export async function applyOpenWelcomePageEffect(
  _ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const url = chrome.runtime.getURL(WELCOME_PAGE_PATH)
  const w = await chrome.windows.create({ url, focused: true })
  return [`opened welcome page in new window ${w.id ?? "?"}`]
}
