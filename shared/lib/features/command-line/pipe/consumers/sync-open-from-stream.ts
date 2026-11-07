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
import { urlBatchesFromBmxtRuleStream } from "./sync-open-batches.ts"
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
  const batches = urlBatchesFromBmxtRuleStream(stream)
  if (batches.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.syncOpen.noUrls", locale)])
  }

  const service = getSyncService()
  const lines: string[] = []
  let allOk = true
  for (const batch of batches) {
    const result = await service.openRemote(matched.deviceId, batch.urls, batch.groupTitle)
    lines.push(...expandSyncLogLines(result.lines, locale))
    if (!result.ok) {
      allOk = false
      break
    }
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
