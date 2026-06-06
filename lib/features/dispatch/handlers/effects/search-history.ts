import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { searchHistoryLines } from "../../../search/sources/history-adapter"

type E = Extract<ChromeEffect, { kind: "search_history" }>

export async function applySearchHistoryEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return searchHistoryLines(e.pattern)
}
