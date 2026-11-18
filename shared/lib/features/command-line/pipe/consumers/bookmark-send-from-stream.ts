/**
 * EN: `bookmark -send <deviceId>` as a pipe consumer — opens/saves/both bookmarks on a remote device.
 * JA: パイプコンシューマとしての `bookmark -send <deviceId>` — リモートデバイスでブックマークを開く/保存/両方。
 */

import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { expandSyncLogLines } from "../../../sync/facade/expand-sync-log.ts"
import { getSyncService } from "../../../sync/facade/sync-service.ts"
import type { BookmarkSendMode } from "./classify.ts"
import { classifyPipeConsumer } from "./classify.ts"
import { bookmarkItemsFromBmxtRuleStream } from "./stream-accepts-kinds.ts"
import { urlBatchesFromBmxtRuleStream } from "./sync-open-batches.ts"
import type { PipeConsumerEntry } from "./types.ts"

export const BOOKMARK_SEND_ACCEPTS_BMXT_RULE_KINDS = [
  "bookmark",
  "bookmark.folder",
  "history",
  "page.open",
  "search.hit"
] as const

export type BookmarkSendPipeMatch = {
  deviceId: string
  mode: BookmarkSendMode
  parentId: string | null
  groupTitle: string | null
}

export function parseBookmarkSendPipeConsumer(segment: string): BookmarkSendPipeMatch | null {
  const classified = classifyPipeConsumer(segment)
  if (classified === null || classified.id !== "bookmark-send") {
    return null
  }
  return {
    deviceId: classified.deviceId,
    mode: classified.mode,
    parentId: classified.parentId,
    groupTitle: classified.groupTitle
  }
}

export function isBookmarkSendPipeConsumer(segment: string): boolean {
  return parseBookmarkSendPipeConsumer(segment) !== null
}

export async function runBookmarkSendFromBmxtRuleStream(
  stream: BmxtRuleStream,
  _deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const matched = parseBookmarkSendPipeConsumer(segment)
  if (matched === null) {
    return segmentFailure("runtime", [tPipe("pipe.bookmarkSend.badArgs", locale)])
  }

  const service = getSyncService()
  const lines: string[] = []
  let allOk = true

  const shouldOpen = matched.mode === "open" || matched.mode === "both"
  const shouldSave = matched.mode === "save" || matched.mode === "both"

  // EN: --open: send URLs to open in remote browser tabs.
  if (shouldOpen) {
    const batches = urlBatchesFromBmxtRuleStream(stream)
    if (batches.length === 0 && !shouldSave) {
      return segmentFailure("runtime", [tPipe("pipe.bookmarkSend.noUrls", locale)])
    }
    for (const batch of batches) {
      const result = await service.openRemote(
        matched.deviceId,
        batch.urls,
        matched.groupTitle ?? batch.groupTitle,
        null,
        batch.groupColor
      )
      lines.push(...expandSyncLogLines(result.lines, locale))
      if (!result.ok) {
        allOk = false
        break
      }
    }
  }

  // EN: --save: import bookmark items into the remote device's bookmark tree.
  if (shouldSave) {
    const items = bookmarkItemsFromBmxtRuleStream(stream)
    if (items.length === 0) {
      // EN: Fall back to URL batches for non-bookmark streams (e.g. history → save).
      const batches = urlBatchesFromBmxtRuleStream(stream)
      const flatItems = batches.flatMap((b) =>
        b.urls.map((url) => ({ url, title: url }))
      )
      if (flatItems.length === 0) {
        return segmentFailure("runtime", [tPipe("pipe.bookmarkSend.noUrls", locale)])
      }
      const result = await service.importBookmarks(matched.deviceId, matched.parentId, flatItems)
      lines.push(...expandSyncLogLines(result.lines, locale))
      if (!result.ok) {
        allOk = false
      }
    } else {
      const result = await service.importBookmarks(
        matched.deviceId,
        matched.parentId,
        items.map(({ url, title }) => ({ url, title }))
      )
      lines.push(...expandSyncLogLines(result.lines, locale))
      if (!result.ok) {
        allOk = false
      }
    }
  }

  return allOk ? segmentSuccess(lines) : segmentFailure("runtime", lines)
}

export const bookmarkSendPipeConsumer: PipeConsumerEntry = {
  id: "bookmark-send",
  match: isBookmarkSendPipeConsumer,
  acceptsKinds: BOOKMARK_SEND_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, segment, _context) =>
    runBookmarkSendFromBmxtRuleStream(stream, deps, locale, segment)
}
