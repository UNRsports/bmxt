/**
 * EN: `bookmark -remove` as a pipe consumer — removes bookmarks selected from a stream.
 * JA: パイプコンシューマとしての `bookmark -remove` — ストリームから選択されたブックマークを削除する。
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
import { bookmarkIdsFromBmxtRuleStream } from "./stream-accepts-kinds.ts"
import type { PipeConsumerEntry } from "./types.ts"

export const BOOKMARK_REMOVE_ACCEPTS_BMXT_RULE_KINDS = [
  "bookmark",
  "bookmark.folder"
] as const

export function isBookmarkRemovePipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "bookmark-remove"
}

export async function runBookmarkRemoveFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const ids = bookmarkIdsFromBmxtRuleStream(stream)
  if (ids.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.bookmarkRemove.noBookmarks", locale)])
  }

  const stdout: string[] = []
  const stderr: string[] = []
  for (const id of ids) {
    const outcome = await runBackgroundSegment(`bookmark -remove ${id}`, deps, locale, {
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

export const bookmarkRemovePipeConsumer: PipeConsumerEntry = {
  id: "bookmark-remove",
  match: isBookmarkRemovePipeConsumer,
  acceptsKinds: BOOKMARK_REMOVE_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, _segment, _context) =>
    runBookmarkRemoveFromBmxtRuleStream(stream, deps, locale)
}
