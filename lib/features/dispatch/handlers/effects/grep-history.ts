import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { grepHistoryLines } from "../../../grep-sources/history-adapter"

type E = Extract<ChromeEffect, { kind: "grep_history" }>

export async function applyGrepHistoryEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return grepHistoryLines(e.pattern)
}
