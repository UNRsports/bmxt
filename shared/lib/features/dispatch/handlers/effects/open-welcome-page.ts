import { openWelcomePageTab } from "../../../welcome/open-welcome-page-tab"
import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "open_welcome_page" }>

export async function applyOpenWelcomePageEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  await openWelcomePageTab()
  return [effectT(ctx, "effect.openWelcomePage.done")]
}
