import { isRunCmdResult } from "../../bmxt-window/terminal-sessions/session-patches.ts"
import { runCommandFromUiAsync } from "../../bmxt-window/terminal-sessions/session-runtime-client.ts"
import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { tError } from "../../setting/i18n/ns/error.ts"
import { classifyOutcomeFromLines, segmentFailure, segmentSuccess } from "./classify-outcome.ts"
import { extractLogLinesFromPatches } from "./extract-patches-lines.ts"
import type { SegmentOutcome } from "./types.ts"

export async function runBackgroundSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  try {
    const response = await runCommandFromUiAsync(
      segment,
      deps.sessionId,
      deps.sessionOrderLength,
      locale,
      deps.hostKind
    )
    if (!isRunCmdResult(response)) {
      const msg = tError("error.unknown", locale)
      return segmentFailure("runtime", [msg], msg)
    }
    if (response.ok === false) {
      const msg = tError("error.generic", locale, { message: response.error })
      return segmentFailure("runtime", [msg], response.error)
    }
    deps.applyRunCmdPatches(response.patches)
    const lines = extractLogLinesFromPatches(response.patches, deps.sessionId)
    const classified = classifyOutcomeFromLines(lines)
    if (classified.ok === false) {
      return segmentFailure(classified.code, lines, classified.errorMessage)
    }
    return segmentSuccess(lines)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const msg = tError("error.dispatchFailed", locale, { message })
    return segmentFailure("runtime", [msg], message)
  }
}
