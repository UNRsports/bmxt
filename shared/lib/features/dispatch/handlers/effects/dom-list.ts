import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"

type E = Extract<ChromeEffect, { kind: "dom_list" }>

export async function applyDomListEffect(ctx: DispatchChromeContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  const pickerMode = e.pickerMode === "with" ? "with" : "normal"
  const showTag = e.showTag === "true" && pickerMode === "with"
  return runPlainListForCommandId(
    "dom",
    {
      flavor: e.flavor,
      pattern: e.pattern,
      pickerMode,
      showTag
    },
    { locale, dispatchCtx: ctx }
  )
}
