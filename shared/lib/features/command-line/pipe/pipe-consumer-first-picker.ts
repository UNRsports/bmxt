/**
 * EN: Pipe-consumer stage (right of `|`) first-token menu — suppress redundant exact matches.
 * JA: パイプ右辺の第一トークンが既に完成しているとき、同じ語の候補メニューを出さない。
 */

import { wordBounds } from "../../format/word-bounds.ts"
import { resolveActiveCommandSegment } from "../compound/active-segment.ts"
import { resolveActivePipeStage } from "../compound/pipe-stage-spans.ts"
import type { ImeTokenPickerModel } from "../ime-token-picker-model.ts"
import { listPipeConsumerCompletionTokens } from "./consumers/completion-tokens.ts"

function isKnownPipeConsumerToken(token: string): boolean {
  const lower = token.toLowerCase()
  for (const name of listPipeConsumerCompletionTokens()) {
    if (name.toLowerCase() === lower) {
      return true
    }
  }
  return false
}

/**
 * EN: Drop the exact current word from first-tier candidates when the token is already complete.
 * Empty result → null (no hollow “browse” after `… | browse`).
 * Also: after a finished consumer + trailing space, do not reopen the full consumer list.
 */
export function suppressExactCompletePipeConsumerFirstPicker(
  hit: ImeTokenPickerModel | null,
  stageLine: string,
  cursor: number
): ImeTokenPickerModel | null {
  if (hit === null || hit.tier !== "first") {
    return hit
  }
  const [l, r] = wordBounds(stageLine, cursor)
  if (cursor < r) {
    return hit
  }
  const word = stageLine.slice(l, r)
  if (word.length === 0) {
    const before = stageLine.slice(0, l).trim()
    const parts = before.length > 0 ? before.split(/\s+/).filter((p) => p.length > 0) : []
    if (parts.length === 1 && isKnownPipeConsumerToken(parts[0]!)) {
      return null
    }
    return hit
  }
  const filtered = hit.candidates.filter((c) => c.toLowerCase() !== word.toLowerCase())
  if (filtered.length === 0) {
    return null
  }
  return { ...hit, candidates: filtered, prefix: hit.prefix }
}

/**
 * EN: Full line — cursor is on a finished pipe-consumer first token with nothing further to offer.
 * Used to close keep-alive hollow menus (same role as `isCompleteSecondTokenWithoutFurtherFixedTokens`).
 */
export function isCompletePipeConsumerWithoutFurtherTokens(
  line: string,
  cursor: number
): boolean {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const pipe = resolveActivePipeStage(segmentLine, active.localCursor)
  if (pipe.stageIndex < 1) {
    return false
  }
  const stageLine = segmentLine.slice(pipe.stageStart, pipe.stageEnd)
  if (
    pipe.localCursor < stageLine.length &&
    !/^\s*$/.test(stageLine.slice(pipe.localCursor))
  ) {
    return false
  }
  const parts = stageLine.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== 1) {
    return false
  }
  return isKnownPipeConsumerToken(parts[0]!)
}
