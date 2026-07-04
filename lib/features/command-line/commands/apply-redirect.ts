import { withMergedLines } from "../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import type { RedirectSpec } from "./parse-redirect.ts"

/**
 * EN: Apply null-sink redirects to an outcome (discard redirected channels).
 * Callers must validate targets with `isNullRedirectTarget` before run.
 */
export function applyRedirectsToOutcome(
  outcome: SegmentOutcome,
  redirects: readonly RedirectSpec[]
): SegmentOutcome {
  if (redirects.length === 0) {
    return outcome
  }

  let stdout = [...outcome.stdout]
  let stderr = [...outcome.stderr]

  for (const redirect of redirects) {
    if (redirect.channel === "stdout") {
      stdout = []
    } else {
      stderr = []
    }
  }

  return withMergedLines(outcome, stdout, stderr)
}
