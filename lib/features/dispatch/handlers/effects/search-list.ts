import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { runSearchListPlain } from "../../../search/search-list-plain"

type E = Extract<ChromeEffect, { kind: "search_list" }>

export async function applySearchListEffect(ctx: DispatchChromeContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  return runSearchListPlain({
    dispatchLine: e.dispatch_line,
    locale,
    ctx
  })
}
