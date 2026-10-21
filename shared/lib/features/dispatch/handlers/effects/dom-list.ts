import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"

type E = Extract<HostEffect, { kind: "dom_list" }>

export async function applyDomListEffect(ctx: DispatchHostContext, e: E): Promise<string[]> {
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
