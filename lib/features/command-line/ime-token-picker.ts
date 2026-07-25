/**
 * EN: IME-style token picker — fixed tokens from WASM `complete`; host overlays for live UI.
 */

import { isBmxtCoreReady, wasmComplete } from "../bmxt-core/wasm-host"
import {
  getSubcommandBranches,
  listSecondTokenCandidatesByCommand,
  listThirdTokenCandidates
} from "../builtin-commands/command-subcommands.gen"
import { resolveCanonical } from "../bmxt-core/registry"
import { tImeToken } from "../setting/i18n/ns/ime-token"
import type { UiLocale } from "../setting/locale"
import {
  matchCandidates,
  pickThirdTokenCandidates,
  resolveOptionTokenFilterModes,
  type CandidateMatchMode
} from "./ime-token-match"
import { resolveActiveCommandSegment } from "./compound/active-segment.ts"
import { resolveActivePipeStage } from "./compound/pipe-stage-spans.ts"
import { listPipeConsumerCompletionTokens } from "./pipe/consumers/completion-tokens.ts"
import { shouldInsertTokenPickAtCursor } from "./first-token-insert.ts"
import { wordBounds } from "../format/word-bounds.ts"
import { rankTokenCandidates } from "./token-candidate-mru.ts"
import type {
  ImeTokenPickerModel,
  ImeTokenTier,
  ResolveImeTokenPickerOptions
} from "./ime-token-picker-model.ts"
import { resolveSecondTokenPickerHit } from "./second-token-picker.ts"
import {
  resolveImeLiveOverlayResult,
  runWithImeLiveOverlayContext
} from "./ime-live-overlays.ts"

export type { CandidateMatchMode } from "./ime-token-match"
export type {
  ImeTokenPickerModel,
  ImeTokenTier,
  ResolveImeTokenPickerOptions
} from "./ime-token-picker-model.ts"

type WasmCompleteHit = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: string
}

function parseWasmCompleteHit(raw: string): WasmCompleteHit | null {
  if (raw === "null" || raw.length === 0) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") {
      return null
    }
    const o = parsed as Record<string, unknown>
    if (
      typeof o.tokenStart !== "number" ||
      typeof o.tokenEnd !== "number" ||
      typeof o.prefix !== "string" ||
      !Array.isArray(o.candidates) ||
      typeof o.tier !== "string"
    ) {
      return null
    }
    const candidates = o.candidates.filter((c): c is string => typeof c === "string")
    if (candidates.length === 0) {
      return null
    }
    return {
      tokenStart: o.tokenStart,
      tokenEnd: o.tokenEnd,
      prefix: o.prefix,
      candidates,
      tier: o.tier
    }
  } catch {
    return null
  }
}

function tierFromWasm(tier: string): ImeTokenTier | null {
  if (tier === "first" || tier === "second" || tier === "third") {
    return tier
  }
  return null
}

function applyHostFilter(
  hit: ImeTokenPickerModel,
  matchMode: CandidateMatchMode
): ImeTokenPickerModel | null {
  const filtered = matchCandidates(hit.candidates, hit.prefix, matchMode)
  if (filtered.length === 0) {
    return null
  }
  return { ...hit, candidates: filtered }
}

/** EN: All tiers — MRU (newest first), then unused A–Z. */
function finalizeCandidateOrder(hit: ImeTokenPickerModel): ImeTokenPickerModel {
  return { ...hit, candidates: rankTokenCandidates(hit.candidates) }
}

/** EN: Prefer WASM fixed-token complete; fall back to generated tables when WASM is cold. */
function resolveFixedTokenPicker(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"
  if (isBmxtCoreReady()) {
    const hit = parseWasmCompleteHit(wasmComplete(line, cursor))
    if (hit !== null) {
      const tier = tierFromWasm(hit.tier)
      if (tier !== null) {
        let model: ImeTokenPickerModel = {
          tokenStart: hit.tokenStart,
          tokenEnd: hit.tokenEnd,
          prefix: hit.prefix,
          candidates: hit.candidates,
          tier
        }
        if (tier === "first") {
          const allowEmptyFirstAll = opts?.emptyFirstPrefixShowsAll === true
          if (hit.prefix.length === 0 && !allowEmptyFirstAll) {
            return null
          }
          if (allowEmptyFirstAll && hit.prefix.length === 0) {
            const cands = matchCandidates(firstCommandTokens, "", matchMode)
            if (cands.length === 0) {
              return null
            }
            const [l, r] = wordBounds(line, cursor)
            const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
            return {
              tokenStart: insertAtCursor ? cursor : l,
              tokenEnd: insertAtCursor ? cursor : r,
              prefix: "",
              candidates: cands,
              tier: "first"
            }
          }
          const [l, r] = wordBounds(line, cursor)
          const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
          if (insertAtCursor) {
            model = { ...model, tokenStart: cursor, tokenEnd: cursor }
          }
        }
        if (tier === "second") {
          const secondHit = resolveSecondTokenPickerHit(line, cursor, matchMode)
          if (secondHit !== null) {
            return secondHit
          }
          // EN: Complete second with no third tokens → close menu (resolved null).
          return null
        }
        if (tier === "third" && matchMode === "contains") {
          const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
            model.candidates,
            model.prefix,
            matchMode
          )
          const cands = pickThirdTokenCandidates(
            model.candidates,
            model.prefix,
            matchMode,
            useFullCandidateList,
            filterMode
          )
          if (cands.length === 0) {
            return null
          }
          return { ...model, candidates: cands }
        }
        return applyHostFilter(model, matchMode)
      }
    }
    if (opts?.emptyFirstPrefixShowsAll === true) {
      const [l, r] = wordBounds(line, cursor)
      const tokensBefore = line.slice(0, l).trim() ? line.slice(0, l).trim().split(/\s+/) : []
      if (tokensBefore.length === 0) {
        const cands = matchCandidates(firstCommandTokens, line.slice(l, cursor), matchMode)
        if (cands.length > 0) {
          const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
          return {
            tokenStart: insertAtCursor ? cursor : l,
            tokenEnd: insertAtCursor ? cursor : r,
            prefix: line.slice(l, cursor),
            candidates: cands,
            tier: "first"
          }
        }
      }
    }
    // EN: WASM prefix-empty None — still resolve second-token incremental filter from tables.
    const secondHit = resolveSecondTokenPickerHit(line, cursor, matchMode)
    if (secondHit !== null) {
      return secondHit
    }
    if (matchMode === "contains") {
      return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
    }
    return null
  }
  return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
}

function resolveFixedTokenPickerFallback(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  const tokenIndex = tokensBefore.length
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  if (tokenIndex === 0) {
    const cmdWord = line.slice(l, r)
    const canonical0 = resolveCanonical(cmdWord)
    if (
      canonical0 &&
      cursor >= line.length &&
      getSubcommandBranches(canonical0).length > 0
    ) {
      const next = listSecondTokenCandidatesByCommand(canonical0, "")
      if (next.length > 0) {
        return {
          tokenStart: line.length,
          tokenEnd: line.length,
          prefix: "",
          candidates: next,
          tier: "second"
        }
      }
    }
    const allowEmptyFirstAll = opts?.emptyFirstPrefixShowsAll === true
    if (prefix.length > 0 || allowEmptyFirstAll) {
      const cands = matchCandidates(firstCommandTokens, prefix, matchMode)
      if (cands.length > 0) {
        const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
        return {
          tokenStart: insertAtCursor ? cursor : l,
          tokenEnd: insertAtCursor ? cursor : r,
          prefix,
          candidates: cands,
          tier: "first"
        }
      }
    }
    return null
  }

  const canonical = resolveCanonical(tokensBefore[0]!)
  if (!canonical || getSubcommandBranches(canonical).length === 0) {
    return null
  }

  if (tokenIndex === 1) {
    return resolveSecondTokenPickerHit(line, cursor, matchMode)
  }

  if (tokenIndex === 2) {
    const second = tokensBefore[1]!.toLowerCase()
    const allThird = listThirdTokenCandidates(canonical, second, "")
    if (allThird.length === 0) {
      return null
    }
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      allThird,
      prefix,
      matchMode
    )
    const cands = pickThirdTokenCandidates(
      allThird,
      prefix,
      matchMode,
      useFullCandidateList,
      filterMode
    )
    if (cands.length === 0) {
      return null
    }
    return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
  }

  return null
}

export function imeTokenPickerHint(tier: ImeTokenTier, locale: UiLocale): string {
  switch (tier) {
    case "first":
      return tImeToken("imeToken.hint.first", locale)
    case "second":
      return tImeToken("imeToken.hint.second", locale)
    case "third":
      return tImeToken("imeToken.hint.third", locale)
  }
}

/** EN: Resolve dropdown candidates for the token under `cursor` (prefix-filtered). */
export function resolveImeTokenPicker(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const pipe = resolveActivePipeStage(segmentLine, active.localCursor)
  const stageLine = segmentLine.slice(pipe.stageStart, pipe.stageEnd)
  const stageTokens =
    pipe.stageIndex >= 1 ? listPipeConsumerCompletionTokens() : firstCommandTokens
  const picked = resolveImeTokenPickerInSegment(
    stageLine,
    pipe.localCursor,
    stageTokens,
    opts
  )
  if (!picked) {
    return null
  }
  const stageAbsStart = active.segmentStart + pipe.stageStart
  return finalizeCandidateOrder({
    ...picked,
    tokenStart: stageAbsStart + picked.tokenStart,
    tokenEnd: stageAbsStart + picked.tokenEnd
  })
}

function resolveImeTokenPickerInSegment(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  const wasmPick = resolveFixedTokenPicker(line, cursor, firstCommandTokens, opts)
  if (wasmPick !== null) {
    return wasmPick
  }

  const overlayResult = runWithImeLiveOverlayContext(
    {
      firstCommandTokens,
      resolveNestedSegment: (nestedLine, nestedCursor, nestedTokens, nestedOpts) =>
        resolveImeTokenPickerInSegment(nestedLine, nestedCursor, nestedTokens, nestedOpts),
      resolveFixedTokenPicker
    },
    () => resolveImeLiveOverlayResult(line, cursor, opts)
  )
  if (overlayResult.type === "suppress") {
    return null
  }
  if (overlayResult.type === "pick") {
    return overlayResult.model
  }

  if (!isBmxtCoreReady()) {
    return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
  }
  if (matchMode === "contains") {
    return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
  }
  return null
}
