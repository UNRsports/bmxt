import type { UiLocale } from "../../setting/locale.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import { shouldOmitCompoundSegmentHeader } from "./omit-compound-segment-header.ts"
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

/**
 * EN: Format segment outcome for the compound log.
 * When the compound run has a single segment (already echoed as `> line`),
 * emit stdout/stderr only — do not repeat `[{segment}]`.
 * JA: 単一セグメント（`> line` 済み）のときは `[{segment}]` を繰り返さず stdout/stderr のみ。
 */
export function formatSegmentOutcomeBlock(
  segment: string,
  outcome: SegmentOutcome,
  locale: UiLocale,
  compoundSegmentCount: number
): CompoundLogBlock {
  if (shouldOmitCompoundSegmentHeader(compoundSegmentCount)) {
    return {
      stdout: [...outcome.stdout],
      stderr: [...outcome.stderr]
    }
  }
  return formatSegmentBlock(segment, outcome, locale)
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
