import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { searchPageLines } from "../../../search/sources/page-adapter"
import { DEFAULT_UI_LOCALE } from "../../../setting/locale"

type E = Extract<HostEffect, { kind: "search_page" }>

export async function applySearchPageEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const shouldCancel = ctx.shouldCancelSearchPage ?? ctx.shouldCancel
  return searchPageLines(
    e.pattern,
    ctx.onSearchPageProgress,
    ctx.searchPageProgressLabel ?? "search -list --page",
    shouldCancel,
    ctx.uiLocale ?? DEFAULT_UI_LOCALE,
    {
      unlimit: ctx.searchPageUnlimit === true,
      onProgressInfo: ctx.onSearchPageProgressInfo
    }
  )
}
