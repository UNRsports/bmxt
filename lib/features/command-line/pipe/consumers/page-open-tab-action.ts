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
import type { PipeConsumerEntry } from "./types.ts"
import type { BmxtRuleKind } from "../../../bmxt-rule/kinds.ts"

/** EN: bmxtRule kinds accepted by tab-target verb pipe consumers. */
export const PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS: readonly BmxtRuleKind[] = ["page.open"]

export type PageOpenTabActionSpec = {
  id: string
  /** EN: Canonical first command (`back` / `forward` / `reload`). */
  commandName: string
  match: (segment: string) => boolean
  noTabsKey: "pipe.back.noTabs" | "pipe.forward.noTabs" | "pipe.reload.noTabs"
  formatSegment: (tabId: number) => string
}

export function makePageOpenTabActionConsumer(
  spec: PageOpenTabActionSpec
): PipeConsumerEntry {
  return {
    id: spec.id,
    match: spec.match,
    acceptsKinds: PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS,
    run: (stream, deps, locale, _segment, _context) =>
      runPageOpenTabActionFromStream(stream, deps, locale, spec)
  }
}

export async function runPageOpenTabActionFromStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  spec: PageOpenTabActionSpec
): Promise<SegmentOutcome> {
  const tabIds = tabIdsFromBmxtRuleStream(stream)
  if (tabIds.length === 0) {
    return segmentFailure("runtime", [tPipe(spec.noTabsKey, locale)])
  }

  const stdout: string[] = []
  const stderr: string[] = []
  for (const tabId of tabIds) {
    const outcome = await runBackgroundSegment(spec.formatSegment(tabId), deps, locale, {
      suppressLogPatches: true
    })
    stderr.push(...outcome.stderr)
    if (!isExitSuccess(outcome.exitStatus)) {
      // EN: On failure, surface any non-prompt log lines that explain the error.
      stdout.push(...outcome.stdout)
      return withMergedLines(outcome, stdout, stderr)
    }
  }
  return withMergedLines(segmentSuccess([]), [], stderr)
}
