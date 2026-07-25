import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { runCommand, type RunCommandOptions } from "../commands/run-command.ts"
import { tryActivateTabChipSegment } from "../pipe/producers/tab-chip-activate.ts"
import { classifyCompoundEligibility } from "./classify-eligibility.ts"
import type { SegmentOutcome } from "./types.ts"

export type RunSegmentOptions = RunCommandOptions

/**
 * EN: Run one compound/pipe segment via the CommandEntry registry (POSIX Profile P7).
 * Chip-only segments (`#t:<id>…`) activate the last chip tab (host short-circuit).
 */
export async function runSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  options?: RunSegmentOptions
): Promise<SegmentOutcome> {
  const chipActivate = await tryActivateTabChipSegment(segment, locale)
  if (chipActivate !== null) {
    return chipActivate
  }

  const eligibility = classifyCompoundEligibility(
    segment,
    locale,
    deps.sessionNameTypingRef.current
  )
  if (eligibility.eligible === false) {
    return eligibility.outcome
  }

  return runCommand(segment, deps, locale, options)
}
