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
 * EN: True when the cursor is on the third+ token after `cmd -list` (options / pipe continuations).
 */
export function isThirdTokenZoneAfterList(stageLine: string, cursor: number): boolean {
  if (!stageLineOffersPipeContinuations(stageLine)) {
    return false
  }
  const [l] = wordBounds(stageLine, cursor)
  const left = stageLine.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/).filter((p) => p.length > 0) : []
  return tokensBefore.length >= 2 && tokensBefore[1]!.toLowerCase() === "-list"
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
 */
export function applyPipeContinuationCandidates(
  hit: ImeTokenPickerModel | null,
  stageLine: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  if (!isThirdTokenZoneAfterList(stageLine, cursor)) {
    return hit
  }
  if (hit !== null && hit.tier !== "third") {
    return hit
  }

  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"
  const [l, r] = wordBounds(stageLine, cursor)
  const prefix = hit?.prefix ?? stageLine.slice(l, cursor)
  const tokenStart = hit?.tokenStart ?? l
  const tokenEnd = hit?.tokenEnd ?? r
  const optionCandidates = hit?.candidates ?? []
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
