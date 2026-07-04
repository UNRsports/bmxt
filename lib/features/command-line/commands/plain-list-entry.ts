import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { segmentSuccess } from "../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { tryRunPlainListCommand } from "../list-commands/index.ts"

/**
 * EN: Compose `-list` producers (`list-commands`) as a CommandEntry.
 * Runs plain list in the UI shell path (including SW-backed producers via fetch).
 */
export async function runPlainListCommandEntry(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const lines = await tryRunPlainListCommand(segment, { locale, deps })
  if (lines === null) {
    return null
  }
  return segmentSuccess(lines)
}
