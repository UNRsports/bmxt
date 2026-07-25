import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { runBackgroundSegment } from "../../compound/run-background-segment.ts"
import {
  segmentFailure,
  segmentSuccess,
  withMergedLines
} from "../../compound/classify-outcome.ts"
import { isExitSuccess } from "../../compound/exit-status.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { CLOSE_ACCEPTS_BMXT_RULE_KINDS, isClosePipeConsumer } from "./close-match.ts"
import { tabIdsFromBmxtRuleStream } from "./stream-accepts-kinds.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { isClosePipeConsumer } from "./close-match.ts"

export async function runCloseFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const tabIds = tabIdsFromBmxtRuleStream(stream)
  if (tabIds.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.close.noTabs", locale)])
  }

  const stdout: string[] = []
  const stderr: string[] = []
  for (const tabId of tabIds) {
    const outcome = await runBackgroundSegment(`close ${tabId}`, deps, locale, {
      suppressLogPatches: true
    })
    stderr.push(...outcome.stderr)
    if (!isExitSuccess(outcome.exitStatus)) {
      stdout.push(...outcome.stdout)
      return withMergedLines(outcome, stdout, stderr)
    }
  }
  return withMergedLines(segmentSuccess([]), [], stderr)
}

export const closePipeConsumer: PipeConsumerEntry = {
  id: "close",
  match: isClosePipeConsumer,
  acceptsKinds: CLOSE_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, _segment) => runCloseFromBmxtRuleStream(stream, deps, locale)
}
