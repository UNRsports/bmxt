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
import { tabIdsFromBmxtRuleStream } from "./stream-accepts-kinds.ts"
import {
  isNewWindowPipeConsumer,
  NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS
} from "./new-window-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export {
  isNewWindowPipeConsumer,
  NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS
} from "./new-window-match.ts"

export async function runNewWindowFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const tabIds = tabIdsFromBmxtRuleStream(stream)
  if (tabIds.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.newWindow.noTabs", locale)])
  }
  const line = `new-window ${tabIds.join(" ")}`
  const outcome = await runBackgroundSegment(line, deps, locale, {
    suppressLogPatches: true
  })
  if (!isExitSuccess(outcome.exitStatus)) {
    return withMergedLines(outcome, outcome.stdout, outcome.stderr)
  }
  return withMergedLines(segmentSuccess(outcome.stdout), outcome.stdout, outcome.stderr)
}

export const newWindowPipeConsumer: PipeConsumerEntry = {
  id: "new-window",
  match: isNewWindowPipeConsumer,
  acceptsKinds: NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, _segment, _context) =>
    runNewWindowFromBmxtRuleStream(stream, deps, locale)
}
