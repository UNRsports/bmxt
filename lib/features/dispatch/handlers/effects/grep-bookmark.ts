import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { grepBookmarkLines } from "../../../grep-sources/bookmark-adapter"

type E = Extract<ChromeEffect, { kind: "grep_bookmark" }>

export async function applyGrepBookmarkEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return grepBookmarkLines(e.pattern)
}
