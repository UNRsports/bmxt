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
  isMovePipeConsumer,
  MOVE_ACCEPTS_BMXT_RULE_KINDS,
  parseMovePipeSegment,
  type MovePipeFlags
} from "./move-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { isMovePipeConsumer, MOVE_ACCEPTS_BMXT_RULE_KINDS } from "./move-match.ts"

function formatMoveSegment(flags: MovePipeFlags, tabIds: number[]): string {
  const parts = ["move"]
  if (flags.ungroup) {
    parts.push("--ungroup")
  } else if (flags.groupId >= 0) {
    parts.push("--group", String(flags.groupId))
  }
  parts.push("--window", String(flags.windowId))
  if (Number.isFinite(flags.beforeTabId) && flags.beforeTabId >= 0) {
    parts.push("--before-tab", String(flags.beforeTabId))
  }
  for (const gid of flags.asGroupIds) {
    if (Number.isFinite(gid) && gid >= 0) {
      parts.push("--as-group", String(gid))
    }
  }
  for (const id of tabIds) {
    parts.push(String(id))
  }
  return parts.join(" ")
}

export async function runMoveFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const flags = parseMovePipeSegment(segment)
  if (flags === null) {
    return segmentFailure("usage", [
      tPipe("pipe.error.unsupportedConsumer", locale, { stage: segment })
    ])
  }
  const tabIds = tabIdsFromBmxtRuleStream(stream)
  if (tabIds.length === 0 && flags.asGroupIds.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.move.noTabs", locale)])
  }
  const outcome = await runBackgroundSegment(
    formatMoveSegment(flags, tabIds),
    deps,
    locale,
    { suppressLogPatches: true }
  )
  if (!isExitSuccess(outcome.exitStatus)) {
    return withMergedLines(outcome, outcome.stdout, outcome.stderr)
  }
  return withMergedLines(segmentSuccess(outcome.stdout), outcome.stdout, outcome.stderr)
}

export const movePipeConsumer: PipeConsumerEntry = {
  id: "move",
  match: isMovePipeConsumer,
  acceptsKinds: MOVE_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, segment, _context) =>
    runMoveFromBmxtRuleStream(stream, deps, locale, segment)
}
