import type { UiLocale } from "../../setting/locale.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import type { SegmentOutcome } from "./types.ts"

export type CompoundLogBlock = {
  stdout: string[]
  stderr: string[]
}

export function formatSegmentBlock(
  segment: string,
  outcome: SegmentOutcome,
  locale: UiLocale
): CompoundLogBlock {
  const header = tCompound("compound.segment.header", locale, { segment })
  return {
    stdout: [header, ...outcome.stdout],
    stderr: [...outcome.stderr]
  }
}

export function formatSkippedSegmentBlock(
  segment: string,
  locale: UiLocale
): CompoundLogBlock {
  return {
    stdout: [tCompound("compound.segment.header", locale, { segment })],
    stderr: [tCompound("compound.segment.skipped", locale)]
  }
}

export function formatParseErrorBlock(
  fullLine: string,
  reason: string,
  locale: UiLocale
): CompoundLogBlock {
  return {
    stdout: [`> ${fullLine}`],
    stderr: [tCompound("compound.parseError", locale, { reason })]
  }
}
