import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"

type E = Extract<ChromeEffect, { kind: "search_list" }>

export async function applySearchListEffect(ctx: DispatchChromeContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  return runPlainListForCommandId(
    "search",
    { dispatchLine: e.dispatch_line },
    { locale, dispatchCtx: ctx }
  )
}
