import type { UiLocale } from "../../setting/locale.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import type { SegmentOutcome } from "./types.ts"

export function formatSegmentBlock(
  segment: string,
  outcome: SegmentOutcome,
  locale: UiLocale
): string[] {
  const header = tCompound("compound.segment.header", locale, { segment })
  if (outcome.lines.length === 0) {
    return [header]
  }
  return [header, ...outcome.lines]
}

export function formatSkippedSegmentBlock(segment: string, locale: UiLocale): string[] {
  return [
    tCompound("compound.segment.header", locale, { segment }),
    tCompound("compound.segment.skipped", locale)
  ]
}

export function formatParseErrorBlock(fullLine: string, reason: string, locale: UiLocale): string[] {
  return [
    `> ${fullLine}`,
    tCompound("compound.parseError", locale, { reason })
  ]
}
