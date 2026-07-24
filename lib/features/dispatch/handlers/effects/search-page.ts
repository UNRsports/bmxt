import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { searchPageLines } from "../../../search/sources/page-adapter"
import { DEFAULT_UI_LOCALE } from "../../../setting/locale"

type E = Extract<ChromeEffect, { kind: "search_page" }>

export async function applySearchPageEffect(
  ctx: DispatchChromeContext,
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
