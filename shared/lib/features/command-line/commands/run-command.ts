import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { segmentFailure, segmentSuccess } from "../compound/classify-outcome.ts"
import { dispatchSegmentUiOutcome } from "../compound/apply-segment-bundle.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import { matchPlainListCommand, tryRunPlainListCommand } from "../list-commands/index.ts"
import { applyRedirectsToOutcome } from "./apply-redirect.ts"
import { isNullRedirectTarget, parseRedirects } from "./parse-redirect.ts"
import { BACKGROUND_COMMAND_ENTRY } from "./registry.ts"

export type RunCommandOptions = {
  /**
   * EN: When true, background `RUN_CMD` skips appendLog/setLog patches (pipe producers).
   * JA: true のとき background `RUN_CMD` のログ patch を適用しない（パイプ左辺用）。
   */
  suppressLogPatches?: boolean
}

/**
 * EN: Single shell entry for segment execution (compound / pipe).
 * Parses redirects, dispatches via WASM `runDispatch`, then background `RUN_CMD`.
 */
export async function runCommand(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  options?: RunCommandOptions
): Promise<SegmentOutcome> {
  const parsed = parseRedirects(segment)
  if (parsed.ok === false) {
    return segmentFailure("parse", [
      tCompound("compound.redirect.parseError", locale, { reason: parsed.error })
    ])
  }

  for (const redirect of parsed.redirects) {
    if (!isNullRedirectTarget(redirect.target)) {
      return segmentFailure("usage", [
        tCompound("compound.redirect.unsupportedTarget", locale, {
          target: redirect.target
        })
      ])
    }
  }

  const outcome = await dispatchSegment(segment, deps, locale, options)
  return applyRedirectsToOutcome(outcome, parsed.redirects)
}

/**
 * EN: Try WASM UI dispatch only; `null` when segment is effects-only (no UI action).
 */
export async function tryRunUiCommand(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const parsed = parseRedirects(segment)
  if (parsed.ok === false) {
    return segmentFailure("parse", [
      tCompound("compound.redirect.parseError", locale, { reason: parsed.error })
    ])
  }

  for (const redirect of parsed.redirects) {
    if (!isNullRedirectTarget(redirect.target)) {
      return segmentFailure("usage", [
        tCompound("compound.redirect.unsupportedTarget", locale, {
          target: redirect.target
        })
      ])
    }
  }

  const { bundle, uiOutcome } = await dispatchSegmentUiOutcome(parsed.command, deps, locale)
  if (bundle.ty === "lines") {
    return applyRedirectsToOutcome(uiOutcome ?? segmentFailure("unknown", []), parsed.redirects)
  }
  if (uiOutcome !== null) {
    return applyRedirectsToOutcome(uiOutcome, parsed.redirects)
  }
  return null
}

async function dispatchSegment(
  commandText: string,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  options?: RunCommandOptions
): Promise<SegmentOutcome> {
  const { bundle, uiOutcome } = await dispatchSegmentUiOutcome(commandText, deps, locale)

  if (bundle.ty === "lines") {
    return uiOutcome ?? segmentFailure("unknown", [`error: unknown command: ${commandText}`])
  }

  if (uiOutcome !== null) {
    return uiOutcome
  }

  // EN: List commands marked runtime=ui (tab/search peer scopes) must not hit SW RUN_CMD.
  // JA: runtime=ui の一覧（tab/search のピア横断）は SW の RUN_CMD に落とさない。
  if (bundle.ty === "effects") {
    const matched = matchPlainListCommand(commandText)
    if (matched !== null && matched.entry.runtime === "ui") {
      const lines = await tryRunPlainListCommand(commandText, { locale, deps })
      if (lines !== null) {
        return segmentSuccess(lines)
      }
    }
    const background = await BACKGROUND_COMMAND_ENTRY.tryRun(commandText, deps, locale, options)
    if (background !== null) {
      return background
    }
  }

  return segmentFailure("unknown", [`error: unknown command: ${commandText}`])
}
