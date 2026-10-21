import { groupTabsResilient } from "../../../tabs/controller/chrome-tab-groups"
import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "group_new" }>

export async function applyGroupNewEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const groupId = await groupTabsResilient(e.tab_ids, ctx.uiLocale)
  return [effectT(ctx, "effect.groupNew.done", { groupId: String(groupId) })]
}
