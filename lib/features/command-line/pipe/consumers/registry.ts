import type { ListResult } from "../../list-output/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { segmentFailure } from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { closePipeConsumer } from "./close-from-tabs.ts"
import { listResultAcceptsKinds } from "./list-result-accepts-kinds.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { listResultAcceptsKinds } from "./list-result-accepts-kinds.ts"

/** EN: Registered pipe consumers (right-hand side of `|`). */
export const PIPE_CONSUMER_ENTRIES: readonly PipeConsumerEntry[] = [closePipeConsumer]

export function matchPipeConsumer(segment: string): PipeConsumerEntry | null {
  const trimmed = segment.trim()
  for (const entry of PIPE_CONSUMER_ENTRIES) {
    if (entry.match(trimmed)) {
      return entry
    }
  }
  return null
}

export async function tryRunPipeConsumer(
  segment: string,
  listResult: ListResult,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const entry = matchPipeConsumer(segment)
  if (entry === null) {
    return null
  }
  if (!listResultAcceptsKinds(listResult, entry.acceptsKinds)) {
    const kinds = entry.acceptsKinds.join(", ")
    return segmentFailure("runtime", [
      tPipe("pipe.error.kindMismatch", locale, { stage: segment.trim(), kinds })
    ])
  }
  return entry.run(listResult, deps, locale, segment)
}
