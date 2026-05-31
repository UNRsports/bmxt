import { openWelcomePageTab } from "../../../welcome/open-welcome-page-tab"
import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "open_welcome_page" }>

export async function applyOpenWelcomePageEffect(
  _ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await openWelcomePageTab()
  return ["opened welcome page in a new tab"]
}
