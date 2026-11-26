import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import {
  isBareDeviceScope,
  listPlanFromSearchListEffect
} from "../../../command-line/list-commands/list-plan-from-ir"
import type { UiLocale } from "../../../setting/locale"
import { tCmd } from "../../../setting/i18n/ns/cmd"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { tSearch } from "../../../setting/i18n/ns/search"

type E = Extract<HostEffect, { kind: "search_list" }>

/**
 * EN: Legacy SW effect path. Cross-device scopes must not run here — WebRTC lives in the UI page.
 * JA: 旧 SW effect。ピア横断は UI ページの WebRTC を見えないため拒否する。
 */
export async function applySearchListEffect(ctx: DispatchHostContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  if (isBareDeviceScope(e.device_scope, e.device_id)) {
    return [tCmd("cmd.cli.device.needIdOrBrowse", locale)]
  }
  try {
    const listPlan = listPlanFromSearchListEffect(e)
    const scope = (listPlan.match as { scope?: { kind: string } }).scope
    if (scope !== undefined && scope.kind !== "local") {
      return [tCmd("cmd.sync.list.requiresUiHost", locale)]
    }
    return runPlainListForCommandId(listPlan.listId, listPlan.match, {
      locale,
      dispatchCtx: ctx
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [tSearch("search.list.error.failed", locale, { message })]
  }
}
