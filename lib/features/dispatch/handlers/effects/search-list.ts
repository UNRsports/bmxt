import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { tSearch } from "../../../setting/i18n/ns/search"

type E = Extract<ChromeEffect, { kind: "search_list" }>

export async function applySearchListEffect(ctx: DispatchChromeContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  try {
    return await runPlainListForCommandId(
      "search",
      { dispatchLine: e.dispatch_line },
      { locale, dispatchCtx: ctx }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [tSearch("search.list.error.failed", locale, { message })]
  }
}
