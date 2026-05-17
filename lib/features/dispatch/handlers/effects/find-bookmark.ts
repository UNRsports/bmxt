import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { findBookmarkLines } from "../../../find-sources/bookmark-adapter"

type E = Extract<ChromeEffect, { kind: "find_bookmark" }>

export async function applyFindBookmarkEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return findBookmarkLines(e.pattern)
}
