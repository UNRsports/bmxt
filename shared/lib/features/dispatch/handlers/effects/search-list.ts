import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { runPlainListForCommandId } from "../../../command-line/list-commands"
import type { UiLocale } from "../../../setting/locale"
import { tCmd } from "../../../setting/i18n/ns/cmd"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import { tSearch } from "../../../setting/i18n/ns/search"
import { parseSearchListLine } from "../../../search/search-list-parse"

type E = Extract<HostEffect, { kind: "search_list" }>

/**
 * EN: Legacy SW effect path. Cross-device scopes must not run here — WebRTC lives in the UI page.
 * JA: 旧 SW effect。ピア横断は UI ページの WebRTC を見えないため拒否する。
 */
export async function applySearchListEffect(ctx: DispatchHostContext, e: E): Promise<string[]> {
  const locale: UiLocale = ctx.uiLocale ?? getRunLocale()
  try {
    const parsed = parseSearchListLine(e.dispatch_line)
    if (parsed !== null && parsed.scope.kind !== "local") {
      return [tCmd("cmd.sync.list.requiresUiHost", locale)]
    }
    const dispatchLine = parsed?.dispatchLine ?? e.dispatch_line
    const peerDispatchLine = parsed?.peerDispatchLine ?? e.dispatch_line
    const scope = parsed?.scope ?? { kind: "local" as const }
    return runPlainListForCommandId(
      "search",
      {
        dispatchLine,
        peerDispatchLine,
        scope
      },
      { locale, dispatchCtx: ctx }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [tSearch("search.list.error.failed", locale, { message })]
  }
}
