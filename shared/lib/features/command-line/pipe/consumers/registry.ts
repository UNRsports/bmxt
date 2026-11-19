import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { segmentFailure } from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { browsePipeConsumer } from "./browse-from-list.ts"
import { bookmarkAddPipeConsumer } from "./bookmark-add-from-stream.ts"
import { bookmarkMovePipeConsumer } from "./bookmark-move-from-stream.ts"
import { bookmarkRemovePipeConsumer } from "./bookmark-remove-from-stream.ts"
import { bookmarkSendPipeConsumer } from "./bookmark-send-from-stream.ts"
import { closePipeConsumer } from "./close-from-stream.ts"
import { backPipeConsumer } from "./back-from-stream.ts"
import { forwardPipeConsumer } from "./forward-from-stream.ts"
import { historyDeletePipeConsumer } from "./history-delete-from-stream.ts"
import { jumpPipeConsumer } from "./jump-from-stream.ts"
import { movePipeConsumer } from "./move-from-stream.ts"
import { newWindowPipeConsumer } from "./new-window-from-stream.ts"
import { openPipeConsumer } from "./open-from-stream.ts"
import { reloadPipeConsumer } from "./reload-from-stream.ts"
import { tabSendPipeConsumer } from "./tab-send-from-stream.ts"
import { bmxtRuleStreamAcceptsKinds } from "./stream-accepts-kinds.ts"
import { pipeConsumerId } from "./classify.ts"
import type { PipeConsumerEntry, PipeConsumerRunContext } from "./types.ts"

export {
  bmxtRuleStreamAcceptsKinds,
  bookmarkIdsFromBmxtRuleStream,
  bookmarkItemsFromBmxtRuleStream,
  tabIdsFromBmxtRuleStream,
  urlsFromHistoryBmxtRuleStream
} from "./stream-accepts-kinds.ts"
export {
  listPipeConsumerCompletionTokens,
  PIPE_CONSUMER_COMPLETION_IDS
} from "./completion-tokens.ts"

/** EN: Registered pipe consumers (right-hand side of `|`). */
export const PIPE_CONSUMER_ENTRIES: readonly PipeConsumerEntry[] = [
  browsePipeConsumer,
  openPipeConsumer,
  jumpPipeConsumer,
  movePipeConsumer,
  newWindowPipeConsumer,
  backPipeConsumer,
  forwardPipeConsumer,
  reloadPipeConsumer,
  closePipeConsumer,
  tabSendPipeConsumer,
  bookmarkRemovePipeConsumer,
  bookmarkAddPipeConsumer,
  bookmarkMovePipeConsumer,
  bookmarkSendPipeConsumer,
  historyDeletePipeConsumer
]

export function matchPipeConsumer(segment: string): PipeConsumerEntry | null {
  const id = pipeConsumerId(segment.trim())
  if (id === null) {
    return null
  }
  for (const entry of PIPE_CONSUMER_ENTRIES) {
    if (entry.id === id) {
      return entry
    }
  }
  return null
}

export async function tryRunPipeConsumer(
  segment: string,
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  context: PipeConsumerRunContext
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
  return entry.run(stream, deps, locale, segment, context)
}
