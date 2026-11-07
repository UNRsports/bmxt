import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { tSearch } from "../../../setting/i18n/ns/search"
import { parseSearchListLine } from "../../../search/search-list-parse"
import { runSearchListPlainWithNotices } from "../../../search/search-list-plain-run"

type E = Extract<HostEffect, { kind: "search_list" }>

export async function applySearchListEffect(ctx: DispatchHostContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  try {
    const parsed = parseSearchListLine(e.dispatch_line)
    if (parsed === null) {
      return runPlainListForCommandId(
        "search",
        {
          dispatchLine: e.dispatch_line,
          peerDispatchLine: e.dispatch_line,
          scope: { kind: "local" as const }
        },
        { locale, dispatchCtx: ctx }
      )
    }
    if (parsed.scope.kind === "local") {
      return runPlainListForCommandId(
        "search",
        {
          dispatchLine: parsed.dispatchLine,
          peerDispatchLine: parsed.peerDispatchLine,
          scope: parsed.scope
        },
        { locale, dispatchCtx: ctx }
      )
    }
    return await runSearchListPlainWithNotices(
      {
        dispatchLine: parsed.dispatchLine,
        peerDispatchLine: parsed.peerDispatchLine,
        scope: parsed.scope
      },
      ctx,
      locale
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [tSearch("search.list.error.failed", locale, { message })]
  }
}
