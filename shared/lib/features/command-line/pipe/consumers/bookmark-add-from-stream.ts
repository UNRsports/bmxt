/**
 * EN: `bookmark -add [--parent <id>] [--force|--skip-dup]` as a pipe consumer.
 *     Accepts `page.open` (and URL-bearing kinds) — common parent for all rows.
 * JA: パイプコンシューマとしての `bookmark -add`。
 *     `page.open` 等を受け、共通の親フォルダへ追加する（最小パイプ）。
 */

import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { applyHostEffects } from "../../../dispatch/apply-effects.ts"
import type { HostEffect } from "../../../dispatch/effect-types.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import type { PipeConsumerEntry } from "./types.ts"
import {
  BOOKMARK_ADD_ACCEPTS_BMXT_RULE_KINDS,
  bookmarkAddItemsFromBmxtRuleStream,
  isBookmarkAddPipeConsumer,
  parseBookmarkAddPipeSegment,
  type BookmarkAddPipeFlags,
  type BookmarkAddStreamItem
} from "./bookmark-add-match.ts"

export {
  BOOKMARK_ADD_ACCEPTS_BMXT_RULE_KINDS,
  bookmarkAddItemsFromBmxtRuleStream,
  isBookmarkAddPipeConsumer,
  parseBookmarkAddPipeSegment
} from "./bookmark-add-match.ts"
export type { BookmarkAddPipeFlags, BookmarkAddStreamItem } from "./bookmark-add-match.ts"

function effectsForItems(
  items: readonly BookmarkAddStreamItem[],
  flags: BookmarkAddPipeFlags
): HostEffect[] {
  return items.map((item) => ({
    kind: "bookmark_create" as const,
    url: item.url,
    title: item.title,
    parent_id: flags.parentId ?? "",
    dup_mode: flags.dupMode
  }))
}

export async function runBookmarkAddFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const flags = parseBookmarkAddPipeSegment(segment)
  if (flags === null) {
    return segmentFailure("usage", [tPipe("pipe.bookmarkAdd.badArgs", locale)])
  }

  const items = bookmarkAddItemsFromBmxtRuleStream(stream)
  if (items.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.bookmarkAdd.noUrls", locale)])
  }

  try {
    const logLines = await applyHostEffects(
      {
        enqueueSessionPatch: () => {},
        clearLog: async () => {},
        exitPane: async () => [],
        listWindows: async () => [],
        focusInfo: async () => [],
        resolveTabArg: async () => undefined,
        commandSessionId: deps.sessionId,
        uiLocale: locale
      },
      effectsForItems(items, flags)
    )
    const hasError = logLines.some((line) => line.startsWith("error:"))
    if (hasError) {
      return segmentFailure("runtime", logLines)
    }
    return segmentSuccess(logLines)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [`error: ${message}`])
  }
}

export const bookmarkAddPipeConsumer: PipeConsumerEntry = {
  id: "bookmark-add",
  match: isBookmarkAddPipeConsumer,
  acceptsKinds: BOOKMARK_ADD_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, segment, _context) =>
    runBookmarkAddFromBmxtRuleStream(stream, deps, locale, segment)
}
