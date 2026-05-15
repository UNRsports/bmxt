import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { findHistoryLines } from "../../../find-sources/history-adapter"

type E = Extract<ChromeEffect, { kind: "find_history" }>

export async function applyFindHistoryEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return findHistoryLines(e.pattern)
}
