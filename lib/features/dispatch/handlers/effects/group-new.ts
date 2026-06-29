import { groupTabsResilient } from "../../../tabs/controller/chrome-tab-groups"
import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "group_new" }>

export async function applyGroupNewEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const groupId = await groupTabsResilient(e.tab_ids, ctx.uiLocale)
  return [effectT(ctx, "effect.groupNew.done", { groupId: String(groupId) })]
}
