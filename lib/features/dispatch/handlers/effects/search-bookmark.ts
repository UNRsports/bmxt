import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { searchBookmarkLines } from "../../../search/sources/bookmark-adapter"

type E = Extract<HostEffect, { kind: "search_bookmark" }>

export async function applySearchBookmarkEffect(
  _ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  return searchBookmarkLines(e.pattern)
}
