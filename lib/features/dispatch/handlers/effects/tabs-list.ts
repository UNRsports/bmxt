import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"

type E = Extract<HostEffect, { kind: "tabs_list" }>

export async function applyTabsListEffect(ctx: DispatchHostContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  const showUrl = e.show_url === "true"
  return runPlainListForCommandId("tabs", { showUrl }, { locale, dispatchCtx: ctx })
}
