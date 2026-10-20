import type { CompoundOperator } from "./parse-compound-segments.ts"
import type { SegmentOutcomeCode } from "./types.ts"

/**
 * BMXt POSIX Profile — numeric exit status constants.
 *
 * Inspired by common shell conventions (not full IEEE Std 1003.1 certification):
 * - 0: success
 * - 1: general runtime / policy error
 * - 2: misuse (usage, parse, incomplete continuation)
 * - 127: command not found
 */
export const EXIT_SUCCESS = 0
export const EXIT_FAILURE = 1
export const EXIT_MISUSE = 2
export const EXIT_NOT_FOUND = 127

/** EN: Map internal segment classification codes to a numeric exit status. */
export function exitStatusForCode(code: SegmentOutcomeCode): number {
  switch (code) {
    case "ok":
      return EXIT_SUCCESS
    case "runtime":
    case "interactive":
    case "cancelled":
      return EXIT_FAILURE
    case "usage":
    case "parse":
    case "continuation":
      return EXIT_MISUSE
    case "unknown":
      return EXIT_NOT_FOUND
  }
}

/** EN: True when the segment (or compound line) succeeded. */
export function isExitSuccess(exitStatus: number): boolean {
  return exitStatus === EXIT_SUCCESS
}

/**
 * EN: Whether `&&` should stop and skip remaining segments.
 * Non-zero exit status short-circuits the chain.
 */
export function compoundShouldStop(exitStatus: number): boolean {
  return !isExitSuccess(exitStatus)
}

/** EN: Whether the next segment should run given the prior exit status and operator. */
export function shouldRunAfterOperator(
  operator: CompoundOperator,
  priorExitStatus: number
): boolean {
  switch (operator) {
    case "&&":
      return isExitSuccess(priorExitStatus)
    case "||":
      return !isExitSuccess(priorExitStatus)
    case ";":
      return true
  }
}
