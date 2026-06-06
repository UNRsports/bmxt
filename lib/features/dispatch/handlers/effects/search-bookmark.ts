import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { searchBookmarkLines } from "../../../search/sources/bookmark-adapter"

type E = Extract<ChromeEffect, { kind: "search_bookmark" }>

export async function applySearchBookmarkEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return searchBookmarkLines(e.pattern)
}
