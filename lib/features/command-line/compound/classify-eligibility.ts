import { continuationPromptAfterLoneFirstToken } from "../../builtin-commands/command-subcommands.gen.ts"
import { isDomListAwaitingFlavor } from "../../dom/dom-list-picker-input.ts"
import { parseDomSettingCommandLine } from "../../dom/parse-dom-setting-command.ts"
import {
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSwitchPickerLine
} from "../../session/session-input.ts"
import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  parseSearchListPickerLine
} from "../../search/search-list-picker-input.ts"
import { parseSettingIncompleteLine } from "../../setting/setting-list-picker-input.ts"
import { parseTabsSettingCommandLine } from "../../tabs/parse-tabs-setting-command.ts"
import { parseTranslateCommandLine } from "../../translate/parse-translate-command.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import type { SegmentOutcome } from "./types.ts"
import { segmentFailure } from "./classify-outcome.ts"

export type CompoundEligibility =
  | { eligible: true }
  | { eligible: false; outcome: SegmentOutcome }

/** EN: Reject continuation / interactive segments inside a compound line. */
export function classifyCompoundEligibility(
  segment: string,
  locale: UiLocale,
  sessionNameTyping: boolean
): CompoundEligibility {
  if (sessionNameTyping) {
    return {
      eligible: false,
      outcome: segmentFailure("interactive", [
        tCompound("compound.error.interactive", locale)
      ])
    }
  }

  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return {
      eligible: false,
      outcome: segmentFailure("parse", [tCompound("compound.error.emptySegment", locale)])
    }
  }

  const loneContinuation = continuationPromptAfterLoneFirstToken(trimmed)
  if (loneContinuation !== null) {
    return {
      eligible: false,
      outcome: segmentFailure("continuation", [
        tCompound("compound.error.continuation", locale, { segment: trimmed })
      ])
    }
  }

  if (parseSettingIncompleteLine(trimmed)) {
    return continuationFailure(trimmed, locale)
  }

  const tabsSetting = parseTabsSettingCommandLine(trimmed)
  if (tabsSetting !== null && tabsSetting.kind !== "page-active") {
    return continuationFailure(trimmed, locale)
  }

  const domSetting = parseDomSettingCommandLine(trimmed)
  if (domSetting !== null && domSetting.kind !== "page-active") {
    return continuationFailure(trimmed, locale)
  }

  const translateCmd = parseTranslateCommandLine(trimmed)
  if (
    translateCmd !== null &&
    translateCmd.kind !== "on" &&
    translateCmd.kind !== "off" &&
    translateCmd.kind !== "setting"
  ) {
    return continuationFailure(trimmed, locale)
  }

  if (isDomListAwaitingFlavor(trimmed)) {
    return continuationFailure(trimmed, locale)
  }

  if (parseSearchListPickerLine(trimmed) !== null) {
    if (isSearchListContinuationPrompt(trimmed) || !isSearchListReadyToRun(trimmed, trimmed)) {
      return continuationFailure(trimmed, locale)
    }
  }

  if (parseSessionListPickerLine(trimmed)) {
    return interactiveFailure(locale)
  }
  if (parseSessionSwitchPickerLine(trimmed)) {
    return interactiveFailure(locale)
  }
  if (parseSessionSettingNameBareLine(trimmed)) {
    return interactiveFailure(locale)
  }

  return { eligible: true }
}

function continuationFailure(segment: string, locale: UiLocale): CompoundEligibility {
  return {
    eligible: false,
    outcome: segmentFailure("continuation", [
      tCompound("compound.error.continuation", locale, { segment })
    ])
  }
}

function interactiveFailure(locale: UiLocale): CompoundEligibility {
  return {
    eligible: false,
    outcome: segmentFailure("interactive", [tCompound("compound.error.interactive", locale)])
  }
}
