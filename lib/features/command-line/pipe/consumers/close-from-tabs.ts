import type { ListResult } from "../../list-output/types.ts"
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
import { CLOSE_ACCEPTS_KINDS, isClosePipeConsumer } from "./close-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { isClosePipeConsumer } from "./close-match.ts"

function tabIdsFromListResult(listResult: ListResult): number[] {
  const ids: number[] = []
  for (const record of listResult.records) {
    if (record.kind !== "tabs.tab") {
      continue
    }
    const tabId = Number(record.fields.tabId)
    if (Number.isFinite(tabId) && tabId > 0) {
      ids.push(tabId)
    }
  }
  return ids
}

export async function runCloseFromTabsListResult(
  listResult: ListResult,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const tabIds = tabIdsFromListResult(listResult)
  if (tabIds.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.close.noTabs", locale)])
  }

  const stdout: string[] = []
  const stderr: string[] = []
  for (const tabId of tabIds) {
    const outcome = await runBackgroundSegment(`close ${tabId}`, deps, locale)
    stdout.push(...outcome.stdout)
    stderr.push(...outcome.stderr)
    if (!isExitSuccess(outcome.exitStatus)) {
      return withMergedLines(outcome, stdout, stderr)
    }
  }
  return withMergedLines(segmentSuccess(stdout), stdout, stderr)
}

export const closePipeConsumer: PipeConsumerEntry = {
  id: "close",
  match: isClosePipeConsumer,
  acceptsKinds: CLOSE_ACCEPTS_KINDS,
  run: runCloseFromTabsListResult
}
