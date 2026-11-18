/**
 * EN: `history -delete` as a pipe consumer — deletes history entries selected from a stream.
 * JA: パイプコンシューマとしての `history -delete` — ストリームから選択された履歴エントリを削除する。
 */

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
import { classifyPipeConsumer } from "./classify.ts"
import { urlsFromHistoryBmxtRuleStream } from "./stream-accepts-kinds.ts"
import type { PipeConsumerEntry } from "./types.ts"

export const HISTORY_DELETE_ACCEPTS_BMXT_RULE_KINDS = [
  "history",
  "search.hit"
] as const

export function isHistoryDeletePipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "history-delete"
}

export async function runHistoryDeleteFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const urls = urlsFromHistoryBmxtRuleStream(stream)
  if (urls.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.historyDelete.noUrls", locale)])
  }

  const stdout: string[] = []
  const stderr: string[] = []
  for (const url of urls) {
    const outcome = await runBackgroundSegment(
      `history -delete ${encodeURIComponent(url)}`,
      deps,
      locale,
      { suppressLogPatches: true }
    )
    stderr.push(...outcome.stderr)
    if (!isExitSuccess(outcome.exitStatus)) {
      stdout.push(...outcome.stdout)
      return withMergedLines(outcome, stdout, stderr)
    }
  }
  return withMergedLines(segmentSuccess([]), [], stderr)
}

export const historyDeletePipeConsumer: PipeConsumerEntry = {
  id: "history-delete",
  match: isHistoryDeletePipeConsumer,
  acceptsKinds: HISTORY_DELETE_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, _segment, _context) =>
    runHistoryDeleteFromBmxtRuleStream(stream, deps, locale)
}
