import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { segmentFailure } from "../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import { applyRedirectsToOutcome } from "./apply-redirect.ts"
import { isNullRedirectTarget, parseRedirects } from "./parse-redirect.ts"
import { BACKGROUND_COMMAND_ENTRY, COMMAND_ENTRIES } from "./registry.ts"

/**
 * EN: Single shell entry for segment execution (compound / pipe).
 * Parses redirects, dispatches `COMMAND_ENTRIES`, then background `RUN_CMD`.
 */
export async function runCommand(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
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

  const outcome = await dispatchCommandEntries(parsed.command, deps, locale)
  return applyRedirectsToOutcome(outcome, parsed.redirects)
}

/**
 * EN: Try UI registry entries only; `null` when no entry owns the segment.
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

  for (const entry of COMMAND_ENTRIES) {
    const outcome = await entry.tryRun(parsed.command, deps, locale)
    if (outcome !== null) {
      return applyRedirectsToOutcome(outcome, parsed.redirects)
    }
  }
  return null
}

async function dispatchCommandEntries(
  commandText: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  for (const entry of COMMAND_ENTRIES) {
    const outcome = await entry.tryRun(commandText, deps, locale)
    if (outcome !== null) {
      return outcome
    }
  }
  const background = await BACKGROUND_COMMAND_ENTRY.tryRun(commandText, deps, locale)
  if (background !== null) {
    return background
  }
  return segmentFailure("unknown", [`error: unknown command: ${commandText}`])
}
