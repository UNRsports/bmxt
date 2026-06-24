import { openWelcomePageTab } from "../../../welcome/open-welcome-page-tab"
import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "open_welcome_page" }>

export async function applyOpenWelcomePageEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  await openWelcomePageTab()
  return [effectT(ctx, "effect.openWelcomePage.done")]
}
