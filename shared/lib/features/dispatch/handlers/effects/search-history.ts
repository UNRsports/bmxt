import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { searchHistoryLines } from "../../../search/sources/history-adapter"

type E = Extract<HostEffect, { kind: "search_history" }>

export async function applySearchHistoryEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  return searchHistoryLines(e.pattern, ctx.shouldCancel)
}
