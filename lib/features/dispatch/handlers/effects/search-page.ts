import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { searchPageLines } from "../../../search/sources/page-adapter"

type E = Extract<ChromeEffect, { kind: "search_page" }>

export async function applySearchPageEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return searchPageLines(
    e.pattern,
    ctx.onSearchPageProgress,
    ctx.searchPageProgressLabel ?? "search -list --page",
    ctx.shouldCancelSearchPage
  )
}
