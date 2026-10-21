import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { searchSnapshotLines } from "../../../search/sources/snapshot-adapter"

type E = Extract<HostEffect, { kind: "search_snapshot" }>

export async function applySearchSnapshotEffect(
  _ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  return searchSnapshotLines(e.pattern)
}
