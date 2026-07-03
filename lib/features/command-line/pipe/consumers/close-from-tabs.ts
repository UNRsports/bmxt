import type { ListResult } from "../../list-output/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { runBackgroundSegment } from "../../compound/run-background-segment.ts"
import { segmentFailure, segmentSuccess } from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"

const CLOSE_PIPE_RE = /^\s*(close|c)\s*$/i

export function isClosePipeConsumer(segment: string): boolean {
  return CLOSE_PIPE_RE.test(segment.trim())
}

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

  const lines: string[] = []
  for (const tabId of tabIds) {
    const outcome = await runBackgroundSegment(`close ${tabId}`, deps, locale)
    lines.push(...outcome.lines)
    if (!outcome.ok) {
      return segmentFailure(outcome.code, lines, outcome.errorMessage)
    }
  }
  return segmentSuccess(lines)
}

export async function tryRunPipeConsumer(
  segment: string,
  listResult: ListResult,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (isClosePipeConsumer(segment)) {
    return runCloseFromTabsListResult(listResult, deps, locale)
  }
  return null
}
