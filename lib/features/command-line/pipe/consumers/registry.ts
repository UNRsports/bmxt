import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { segmentFailure } from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { closePipeConsumer } from "./close-from-stream.ts"
import { backPipeConsumer } from "./back-from-stream.ts"
import { forwardPipeConsumer } from "./forward-from-stream.ts"
import { reloadPipeConsumer } from "./reload-from-stream.ts"
import { bmxtRuleStreamAcceptsKinds } from "./stream-accepts-kinds.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { bmxtRuleStreamAcceptsKinds, tabIdsFromBmxtRuleStream } from "./stream-accepts-kinds.ts"
export {
  listPipeConsumerCompletionTokens,
  PIPE_CONSUMER_COMPLETION_IDS
} from "./completion-tokens.ts"

/** EN: Registered pipe consumers (right-hand side of `|`). */
export const PIPE_CONSUMER_ENTRIES: readonly PipeConsumerEntry[] = [
  backPipeConsumer,
  forwardPipeConsumer,
  reloadPipeConsumer,
  closePipeConsumer
]

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
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const entry = matchPipeConsumer(segment)
  if (entry === null) {
    return null
  }
  if (!bmxtRuleStreamAcceptsKinds(stream, entry.acceptsKinds)) {
    const kinds = entry.acceptsKinds.join(", ")
    return segmentFailure("runtime", [
      tPipe("pipe.error.kindMismatch", locale, { stage: segment.trim(), kinds })
    ])
  }
  return entry.run(stream, deps, locale, segment)
}
