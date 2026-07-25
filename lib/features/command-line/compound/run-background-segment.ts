import { isRunCmdResult } from "../../bmxt-window/terminal-sessions/session-patches.ts"
import type { SessionPatch } from "../../bmxt-window/terminal-sessions/session-patches.ts"
import { runCommandFromUiAsync } from "../../bmxt-window/terminal-sessions/session-runtime-client.ts"
import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { tError } from "../../setting/i18n/ns/error.ts"
import { classifyOutcomeFromLines, segmentFailure, segmentSuccess } from "./classify-outcome.ts"
import { extractLogLinesFromPatches } from "./extract-patches-lines.ts"
import type { SegmentOutcome } from "./types.ts"

export type RunBackgroundSegmentOptions = {
  /**
   * EN: Skip applying appendLog/setLog patches (effects still apply).
   * Success stdout is empty; failures still surface via outcome stderr.
   * JA: ログ patch を適用しない（effect は適用）。成功時 stdout は空、失敗は stderr。
   */
  suppressLogPatches?: boolean
}

/** EN: Drop terminal log patches; keep effects / session patches. */
export function withoutLogPatches(patches: readonly SessionPatch[]): SessionPatch[] {
  const out: SessionPatch[] = []
  for (const patch of patches) {
    if (patch.type === "appendLog" || patch.type === "setLog") {
      continue
    }
    out.push(patch)
  }
  return out
}

export async function runBackgroundSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  options?: RunBackgroundSegmentOptions
): Promise<SegmentOutcome> {
  const suppressLogPatches = options?.suppressLogPatches === true
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
    const lines = extractLogLinesFromPatches(response.patches, deps.sessionId)
    const patchesToApply = suppressLogPatches
      ? withoutLogPatches(response.patches)
      : response.patches
    deps.applyRunCmdPatches(patchesToApply)
    const classified = classifyOutcomeFromLines(lines)
    if (classified.ok === false) {
      return segmentFailure(classified.code, lines, classified.errorMessage)
    }
    if (suppressLogPatches) {
      return segmentSuccess([])
    }
    return segmentSuccess(lines)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const msg = tError("error.dispatchFailed", locale, { message })
    return segmentFailure("runtime", [msg], message)
  }
}
