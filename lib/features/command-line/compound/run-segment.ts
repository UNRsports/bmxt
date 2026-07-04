import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { runCommand } from "../commands/run-command.ts"
import { classifyCompoundEligibility } from "./classify-eligibility.ts"
import type { SegmentOutcome } from "./types.ts"

/**
 * EN: Run one compound/pipe segment via the CommandEntry registry (POSIX Profile P7).
 */
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

  return runCommand(segment, deps, locale)
}
