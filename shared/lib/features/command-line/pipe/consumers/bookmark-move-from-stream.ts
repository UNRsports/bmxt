/**
 * EN: `bookmark -move --parent <id>` as a pipe consumer — moves bookmarks into a folder.
 * JA: パイプコンシューマとしての `bookmark -move --parent <id>` — ブックマークをフォルダへ移動する。
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

export const BOOKMARK_MOVE_ACCEPTS_BMXT_RULE_KINDS = [
  "bookmark",
  "bookmark.folder"
] as const

export function parseBookmarkMovePipeSegment(
  segment: string
): { parentId: string; index: number | null } | null {
  const classified = classifyPipeConsumer(segment)
  if (classified === null || classified.id !== "bookmark-move") {
    return null
  }
  return { parentId: classified.parentId, index: classified.index }
}

export function isBookmarkMovePipeConsumer(segment: string): boolean {
  return parseBookmarkMovePipeSegment(segment) !== null
}

function buildMoveSegment(parentId: string, index: number | null, id: string): string {
  const parts = ["bookmark", "-move", "--parent", parentId]
  if (index !== null) {
    parts.push("--index", String(index + 1))
  }
  parts.push(id)
  return parts.join(" ")
}

export async function runBookmarkMoveFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const flags = parseBookmarkMovePipeSegment(segment)
  if (flags === null) {
    return segmentFailure("usage", [
      tPipe("pipe.error.unsupportedConsumer", locale, { stage: segment })
    ])
  }

  const ids = bookmarkIdsFromBmxtRuleStream(stream)
  if (ids.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.bookmarkMove.noBookmarks", locale)])
  }

  const stdout: string[] = []
  const stderr: string[] = []
  let currentIndex = flags.index
  for (const id of ids) {
    const outcome = await runBackgroundSegment(
      buildMoveSegment(flags.parentId, currentIndex, id),
      deps,
      locale,
      { suppressLogPatches: true }
    )
    stderr.push(...outcome.stderr)
    if (!isExitSuccess(outcome.exitStatus)) {
      stdout.push(...outcome.stdout)
      return withMergedLines(outcome, stdout, stderr)
    }
    if (currentIndex !== null) {
      currentIndex += 1
    }
  }
  return withMergedLines(segmentSuccess([]), [], stderr)
}

export const bookmarkMovePipeConsumer: PipeConsumerEntry = {
  id: "bookmark-move",
  match: isBookmarkMovePipeConsumer,
  acceptsKinds: BOOKMARK_MOVE_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, segment, _context) =>
    runBookmarkMoveFromBmxtRuleStream(stream, deps, locale, segment)
}
