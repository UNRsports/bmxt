import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { classifyCompoundEligibility } from "./classify-eligibility.ts"
import { runBackgroundSegment } from "./run-background-segment.ts"
import { tryRunUiSegment } from "./run-ui-segment.ts"
import type { SegmentOutcome } from "./types.ts"

export async function runSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const eligibility = classifyCompoundEligibility(
    segment,
    locale,
    deps.sessionNameTypingRef.current
  )
  if (eligibility.eligible === false) {
    return eligibility.outcome
  }

  const uiOutcome = await tryRunUiSegment(segment, deps, locale)
  if (uiOutcome !== null) {
    return uiOutcome
  }

  return runBackgroundSegment(segment, deps, locale)
}
