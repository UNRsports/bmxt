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
import { classifyPipeConsumer } from "./classify.ts"
import {
  isNewWindowPipeConsumer,
  NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS
} from "./new-window-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export {
  isNewWindowPipeConsumer,
  NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS
} from "./new-window-match.ts"

function formatNewWindowSegment(asGroupIds: readonly number[], tabIds: number[]): string {
  const parts = ["new-window"]
  for (const gid of asGroupIds) {
    if (Number.isFinite(gid) && gid >= 0) {
      parts.push("--as-group", String(gid))
    }
  }
  for (const id of tabIds) {
    parts.push(String(id))
  }
  return parts.join(" ")
}

export async function runNewWindowFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const classified = classifyPipeConsumer(segment)
  const asGroupIds =
    classified !== null && classified.id === "new-window" ? classified.asGroupIds : []
  const tabIds = tabIdsFromBmxtRuleStream(stream)
  if (tabIds.length === 0 && asGroupIds.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.newWindow.noTabs", locale)])
  }
  const line = formatNewWindowSegment(asGroupIds, tabIds)
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
  run: (stream, deps, locale, segment, _context) =>
    runNewWindowFromBmxtRuleStream(stream, deps, locale, segment)
}
