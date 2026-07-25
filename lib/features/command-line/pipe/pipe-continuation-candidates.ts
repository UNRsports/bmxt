/**
 * EN: Pipe-continuation candidates for the list-producer stage (before `|`).
 * JA: リスト左辺完了後に第三段へ載せる `| browse` 等（PIPE_CONSUMER 正本）。
 */

import { wordBounds } from "../../format/word-bounds.ts"
import { PICKER_LIST_PRODUCER_TOKENS } from "../../picker/list-producers.ts"
import type { CandidateMatchMode } from "../ime-token-match.ts"
import type { ImeTokenPickerModel, ResolveImeTokenPickerOptions } from "../ime-token-picker-model.ts"
import { listPipeConsumerCompletionTokens } from "./consumers/completion-tokens.ts"

const PIPE_PRODUCER_FIRST = new Set(
  PICKER_LIST_PRODUCER_TOKENS.map((token) => token.toLowerCase())
)

/** EN: Display / pick tokens like `| browse` (space after `|`). */
export function listPipeContinuationCandidateTokens(): string[] {
  return listPipeConsumerCompletionTokens().map((name) => `| ${name}`)
}

/** EN: True when `token` is a pipe-continuation menu candidate (`| browse`, …). */
export function isPipeContinuationCandidate(token: string): boolean {
  return /^\|\s+\S/.test(token.trim())
}

/** EN: Menu includes at least one `| …` continuation (open / prefer over bare submit). */
export function candidatesIncludePipeContinuation(candidates: readonly string[]): boolean {
  for (const token of candidates) {
    if (isPipeContinuationCandidate(token)) {
      return true
    }
  }
  return false
}

/**
 * EN: Stage line is a list producer with `-list` already present (may still be typing options).
 * JA: 第一が list プロデューサーかつ第二が `-list`。
 */
export function stageLineOffersPipeContinuations(stageLine: string): boolean {
  const parts = stageLine.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return false
  }
  if (!PIPE_PRODUCER_FIRST.has(parts[0]!.toLowerCase())) {
    return false
  }
  return parts[1]!.toLowerCase() === "-list"
}

/**
 * EN: True when the cursor may accept `| browse`… after a list producer `-list`.
 * Covers: third+ token zone, trailing space after `-list`, and complete `-list` at EOL (no space).
 */
export function isPipeContinuationOfferZone(stageLine: string, cursor: number): boolean {
  if (!stageLineOffersPipeContinuations(stageLine)) {
    return false
  }
  const [l, r] = wordBounds(stageLine, cursor)
  const left = stageLine.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/).filter((p) => p.length > 0) : []

  if (tokensBefore.length >= 2 && tokensBefore[1]!.toLowerCase() === "-list") {
    return true
  }

  // EN: `setting -list` at EOL — cursor still on the complete `-list` word (no trailing space yet).
  if (
    tokensBefore.length === 1 &&
    PIPE_PRODUCER_FIRST.has(tokensBefore[0]!.toLowerCase())
  ) {
    const word = stageLine.slice(l, r)
    if (word.toLowerCase() !== "-list") {
      return false
    }
    if (cursor < r) {
      return false
    }
    const after = stageLine.slice(r)
    if (after.length > 0 && !/^\s*$/.test(after)) {
      return false
    }
    return true
  }

  return false
}

/** @deprecated Use `isPipeContinuationOfferZone`. */
export function isThirdTokenZoneAfterList(stageLine: string, cursor: number): boolean {
  return isPipeContinuationOfferZone(stageLine, cursor)
}

function isCursorOnCompleteListSecond(stageLine: string, cursor: number): boolean {
  const [l, r] = wordBounds(stageLine, cursor)
  const left = stageLine.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/).filter((p) => p.length > 0) : []
  if (tokensBefore.length !== 1) {
    return false
  }
  if (!PIPE_PRODUCER_FIRST.has(tokensBefore[0]!.toLowerCase())) {
    return false
  }
  const word = stageLine.slice(l, r)
  return word.toLowerCase() === "-list" && cursor >= r
}

/**
 * EN: Filter continuation tokens. Prefix starting with `-` yields none (option typing).
 * Empty / `|…` prefixes match; bare consumer-name prefixes also match after `| `.
 */
export function matchPipeContinuationCandidates(
  candidates: readonly string[],
  prefix: string,
  mode: CandidateMatchMode
): string[] {
  if (prefix.startsWith("-")) {
    return []
  }
  if (prefix.length === 0) {
    return [...candidates]
  }
  const p = prefix.replace(/\s+/g, " ").toLowerCase()
  const pAfterPipe = p.replace(/^\|\s*/, "")
  return candidates.filter((candidate) => {
    const cl = candidate.toLowerCase()
    const name = cl.replace(/^\|\s*/, "")
    if (mode === "contains") {
      if (cl.includes(p)) {
        return true
      }
      return pAfterPipe.length > 0 && name.includes(pAfterPipe)
    }
    if (cl.startsWith(p)) {
      return true
    }
    if (p.startsWith("|")) {
      return name.startsWith(pAfterPipe)
    }
    return name.startsWith(p)
  })
}

/**
 * EN: Merge option third-tokens with pipe continuations (options first, then `| …`).
 */
export function mergeOptionAndPipeContinuationCandidates(
  optionCandidates: readonly string[],
  prefix: string,
  mode: CandidateMatchMode
): string[] {
  const pipeFiltered = matchPipeContinuationCandidates(
    listPipeContinuationCandidateTokens(),
    prefix,
    mode
  )
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of optionCandidates) {
    if (seen.has(token)) {
      continue
    }
    seen.add(token)
    out.push(token)
  }
  for (const token of pipeFiltered) {
    if (seen.has(token)) {
      continue
    }
    seen.add(token)
    out.push(token)
  }
  return out
}

/**
 * EN: Merge `| browse`… into third-tier picks on list producers; synthesize when options are empty.
 * Also offers continuations when `-list` is complete at EOL (with or without trailing space).
 * Stale second-tier menus on a complete `-list` word are replaced by the pipe menu.
 */
export function applyPipeContinuationCandidates(
  hit: ImeTokenPickerModel | null,
  stageLine: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  if (!stageLineOffersPipeContinuations(stageLine)) {
    return hit
  }

  const onCompleteListWord = isCursorOnCompleteListSecond(stageLine, cursor)
  // EN: Do not keep `-list` / sibling second heads once `-list` is complete — offer `| …`.
  let effectiveHit = hit
  if (onCompleteListWord && hit !== null && hit.tier === "second") {
    effectiveHit = null
  }

  if (effectiveHit !== null && effectiveHit.tier !== "third") {
    return effectiveHit
  }

  const inOfferZone = isPipeContinuationOfferZone(stageLine, cursor)
  const mergeExistingThird = effectiveHit !== null && effectiveHit.tier === "third"
  if (!inOfferZone && !mergeExistingThird) {
    return effectiveHit
  }

  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"
  const [l, r] = wordBounds(stageLine, cursor)

  let prefix: string
  let tokenStart: number
  let tokenEnd: number
  if (effectiveHit !== null) {
    prefix = effectiveHit.prefix
    tokenStart = effectiveHit.tokenStart
    tokenEnd = effectiveHit.tokenEnd
  } else if (onCompleteListWord) {
    // EN: Append after `-list` — do not replace the second token.
    prefix = ""
    tokenStart = stageLine.length
    tokenEnd = stageLine.length
  } else {
    prefix = stageLine.slice(l, cursor)
    tokenStart = l
    tokenEnd = r
  }

  const optionCandidates = effectiveHit?.candidates ?? []
  const merged = mergeOptionAndPipeContinuationCandidates(
    optionCandidates,
    prefix,
    matchMode
  )
  if (merged.length === 0) {
    return null
  }
  return {
    tokenStart,
    tokenEnd,
    prefix,
    candidates: merged,
    tier: "third"
  }
}

/**
 * EN: Replace the current token range with ` | <consumer>` (single space before `|`).
 * JA: 現在トークンを消し、` | browse` 形を挿入する。
 */
export function buildPipeContinuationPickLine(
  line: string,
  tokenStart: number,
  tokenEnd: number,
  candidate: string
): { line: string; cursor: number } {
  const trimmedCandidate = candidate.trim()
  if (!isPipeContinuationCandidate(trimmedCandidate)) {
    return { line, cursor: tokenEnd }
  }
  const before = line.slice(0, tokenStart).replace(/\s+$/, "")
  const afterRaw = line.slice(tokenEnd)
  const after = afterRaw.replace(/^\s+/, "")
  const insert = ` ${trimmedCandidate}`
  const nextLine =
    after.length === 0 ? `${before}${insert}` : `${before}${insert} ${after}`
  return {
    line: nextLine,
    cursor: before.length + insert.length
  }
}
