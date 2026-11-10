import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import {
  closeLocalTabsByIds,
  tabIdsForOpenedUrls,
  type LocalOpenSource
} from "../../../sync/bus/close-local-after-open.ts"
import { pairLocalSourcesForOpen } from "../../../sync/bus/pair-sources-for-open.ts"
import { expandSyncLogLines } from "../../../sync/facade/expand-sync-log.ts"
import { getSyncService } from "../../../sync/facade/sync-service.ts"
import {
  streamHasRemotePageOpen,
  urlBatchesFromBmxtRuleStream
} from "./sync-open-batches.ts"
import {
  isSyncOpenPipeConsumer,
  parseSyncOpenPipeConsumer,
  SYNC_OPEN_ACCEPTS_BMXT_RULE_KINDS
} from "./sync-open-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { urlBatchesFromBmxtRuleStream } from "./sync-open-batches.ts"

export async function runSyncOpenFromBmxtRuleStream(
  stream: BmxtRuleStream,
  _deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const matched = parseSyncOpenPipeConsumer(segment)
  if (matched === null) {
    return segmentFailure("runtime", [tPipe("pipe.syncOpen.badArgs", locale)])
  }
  if (matched.closeAfter && streamHasRemotePageOpen(stream)) {
    return segmentFailure("runtime", [tPipe("pipe.syncOpen.closeLocalOnly", locale)])
  }
  const batches = urlBatchesFromBmxtRuleStream(stream)
  if (batches.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.syncOpen.noUrls", locale)])
  }

  const service = getSyncService()
  const lines: string[] = []
  let allOk = true
  const allOpened: string[] = []
  const allSources: LocalOpenSource[] = []
  for (const batch of batches) {
    const sources = pairLocalSourcesForOpen(batch.urls, batch.tabIds)
    const result = await service.openRemote(matched.deviceId, batch.urls, batch.groupTitle)
    lines.push(...expandSyncLogLines(result.lines, locale))
    allSources.push(...sources)
    allOpened.push(...result.openedUrls)
    if (!result.ok) {
      allOk = false
      break
    }
  }
  if (matched.closeAfter && allOpened.length > 0) {
    const toClose = tabIdsForOpenedUrls(allSources, allOpened)
    const closed = await closeLocalTabsByIds(toClose)
    lines.push(...expandSyncLogLines([`sync.open.closed:${closed}`], locale))
  }
  return allOk ? segmentSuccess(lines) : segmentFailure("runtime", lines)
}

export const syncOpenPipeConsumer: PipeConsumerEntry = {
  id: "sync",
  match: isSyncOpenPipeConsumer,
  acceptsKinds: SYNC_OPEN_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, segment, _context) =>
    runSyncOpenFromBmxtRuleStream(stream, deps, locale, segment)
}
