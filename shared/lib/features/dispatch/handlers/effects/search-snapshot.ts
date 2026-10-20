import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { searchSnapshotLines } from "../../../search/sources/snapshot-adapter"

type E = Extract<ChromeEffect, { kind: "search_snapshot" }>

export async function applySearchSnapshotEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return searchSnapshotLines(e.pattern)
}
