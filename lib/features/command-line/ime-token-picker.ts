/**
 * EN: IME-style token picker — fixed tokens from WASM `complete`; host overlays for live UI.
 */

import { isBmxtCoreReady, wasmComplete } from "../bmxt-core/wasm-host"
import {
  getSubcommandBranches,
  isSecondToken,
  listSecondTokenCandidatesByCommand,
  listThirdTokenCandidates
} from "../builtin-commands/command-subcommands.gen"
import { resolveCanonical } from "../bmxt-core/registry"
import {
  isSearchListAwaitingScopeOrPattern,
  shouldShowSearchListPatternPlaceholder
} from "../search/search-list-picker-input"
import {
  isDomListAwaitingMoreOptionsAtEol,
  isEditingDomListOptionToken,
  listDomListRemainingOptionCandidates,
  shouldShowDomListPatternPlaceholder
} from "../dom/dom-list-picker-parse.ts"
import { domListLineHasFlavor } from "../dom/parse-dom-list-args.ts"
import { tImeToken } from "../setting/i18n/ns/ime-token"
import type { UiLocale } from "../setting/locale"
import { TABS_PAGE_ACTIVE_MODE_TOKENS } from "../tabs/page-active-setting"
import { DOM_PAGE_ACTIVE_MODE_TOKENS } from "../dom/page-active-setting"
import {
  matchCandidates,
  pickThirdTokenCandidates,
  resolveOptionTokenFilterModes,
  type CandidateMatchMode
} from "./ime-token-match"
import { mapSegmentOffsetToLine, resolveActiveCommandSegment } from "./compound/active-segment.ts"
import { shouldInsertTokenPickAtCursor } from "./first-token-insert.ts"
import { PICKER_LIST_PRODUCER_TOKENS } from "../picker/list-producers.ts"
import { wordBounds } from "../format/word-bounds.ts"
import { rankTokenCandidates } from "./token-candidate-mru.ts"
import type { ImeTokenPickerModel, ImeTokenTier } from "./ime-token-picker-model.ts"
import { resolveSecondTokenPickerHit } from "./second-token-picker.ts"

export type { CandidateMatchMode } from "./ime-token-match"
export type { ImeTokenPickerModel, ImeTokenTier } from "./ime-token-picker-model.ts"

export type ResolveImeTokenPickerOptions = {
  emptyFirstPrefixShowsAll?: boolean
  candidateMatch?: CandidateMatchMode
}

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

function resolveDomListOptionTokenPicker(
  line: string,
  cursor: number,
  tokensBefore: readonly string[],
  l: number,
  r: number,
  prefix: string,
  matchMode: CandidateMatchMode
): ImeTokenPickerModel | null {
  if (tokensBefore[0]?.toLowerCase() !== "dom" || tokensBefore[1]?.toLowerCase() !== "-list") {
    return null
  }
  if (shouldShowDomListPatternPlaceholder(line, cursor)) {
    return null
  }
  const tokensAfterList = tokensBefore.slice(2)
  if (domListLineHasFlavor(line.trim()) && !isEditingDomListOptionToken(line, cursor)) {
    return null
  }
  const allRemaining = listDomListRemainingOptionCandidates(tokensAfterList, "")
  if (allRemaining.length === 0) {
    return null
  }
  const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
    allRemaining,
    prefix,
    matchMode
  )
  const cands = pickThirdTokenCandidates(
    allRemaining,
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

function resolvePageActiveModePicker(
  line: string,
  cursor: number
): ImeTokenPickerModel | null {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  if (tokensBefore.length !== 3) {
    return null
  }
  const canonical = resolveCanonical(tokensBefore[0]!)
  const second = tokensBefore[1]!.toLowerCase()
  const third = tokensBefore[2]!.toLowerCase()
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = "prefix"
  if (canonical === "tab" && second === "-setting" && third === "-page-active") {
    const cands = matchCandidates(TABS_PAGE_ACTIVE_MODE_TOKENS, prefix, matchMode)
    if (cands.length === 0) {
      return null
    }
    return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
  }
  if (canonical === "dom" && second === "-setting" && third === "-page-active") {
    const cands = matchCandidates(DOM_PAGE_ACTIVE_MODE_TOKENS, prefix, matchMode)
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
  const picked = resolveImeTokenPickerInSegment(
    segmentLine,
    active.localCursor,
    firstCommandTokens,
    opts
  )
  if (!picked) {
    return null
  }
  return finalizeCandidateOrder({
    ...picked,
    tokenStart: mapSegmentOffsetToLine(active.segmentStart, picked.tokenStart),
    tokenEnd: mapSegmentOffsetToLine(active.segmentStart, picked.tokenEnd)
  })
}

function remapPickerProducerTier(tier: ImeTokenTier): ImeTokenTier {
  if (tier === "first") {
    return "second"
  }
  if (tier === "second") {
    return "third"
  }
  return "third"
}

/**
 * EN: `browse <list-command>…` — complete the producer segment as a normal command line.
 * JA: `browse <list-command>…` — 後続を通常のコマンド行として補完する。
 */
function resolvePickerPrefixedTokenPicker(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const prefixMatch = /^(\s*)browse(\s+)/i.exec(line)
  if (prefixMatch === null) {
    return null
  }
  const producerStart = prefixMatch[0].length
  if (cursor < producerStart) {
    return null
  }

  const producerLine = line.slice(producerStart)
  const producerCursor = cursor - producerStart

  if (producerLine.trim().length === 0) {
    return {
      tokenStart: producerStart,
      tokenEnd: producerStart,
      prefix: "",
      candidates: [...PICKER_LIST_PRODUCER_TOKENS],
      tier: "second"
    }
  }

  const picked = resolveImeTokenPickerInSegment(
    producerLine,
    producerCursor,
    PICKER_LIST_PRODUCER_TOKENS,
    {
      ...opts,
      emptyFirstPrefixShowsAll: true
    }
  )
  if (picked === null) {
    return null
  }
  return {
    ...picked,
    tokenStart: picked.tokenStart + producerStart,
    tokenEnd: picked.tokenEnd + producerStart,
    tier: remapPickerProducerTier(picked.tier)
  }
}

function resolveImeTokenPickerInSegment(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const pickerPrefixed = resolvePickerPrefixedTokenPicker(line, cursor, opts)
  if (pickerPrefixed !== null) {
    return pickerPrefixed
  }

  if (
    shouldShowSearchListPatternPlaceholder(line, cursor) &&
    !isSearchListAwaitingScopeOrPattern(line)
  ) {
    return null
  }

  if (
    shouldShowDomListPatternPlaceholder(line, cursor) &&
    !isDomListAwaitingMoreOptionsAtEol(line)
  ) {
    return null
  }

  if (isSearchListAwaitingScopeOrPattern(line) && cursor >= line.length) {
    const fixed = resolveFixedTokenPicker(line, cursor, firstCommandTokens, opts)
    if (fixed !== null && fixed.tier === "third") {
      return fixed
    }
  }

  if (isDomListAwaitingMoreOptionsAtEol(line) && cursor >= line.length) {
    const parts = line.trim().split(/\s+/).filter(Boolean)
    const cands = listDomListRemainingOptionCandidates(parts.slice(2), "")
    if (cands.length > 0) {
      return {
        tokenStart: line.length,
        tokenEnd: line.length,
        prefix: "",
        candidates: [...cands],
        tier: "third"
      }
    }
  }

  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  const tokenIndex = tokensBefore.length
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  if (tokenIndex === 0) {
    const cmdWord = line.slice(l, r)
    if (resolveCanonical(cmdWord) === "browse" && cursor >= line.length) {
      return {
        tokenStart: line.length,
        tokenEnd: line.length,
        prefix: "",
        candidates: [...PICKER_LIST_PRODUCER_TOKENS],
        tier: "second"
      }
    }
  }

  const pageActive = resolvePageActiveModePicker(line, cursor)
  if (pageActive !== null) {
    return pageActive
  }

  if (tokenIndex >= 1) {
    const canonical = resolveCanonical(tokensBefore[0]!)
    if (canonical === "dom" && tokensBefore[1]?.toLowerCase() === "-list") {
      const atEolAfterSecond =
        tokenIndex === 1 && cursor >= line.length && isSecondToken(canonical, line.slice(l, r))
      const domPick = resolveDomListOptionTokenPicker(
        line,
        cursor,
        tokensBefore,
        atEolAfterSecond ? line.length : l,
        atEolAfterSecond ? line.length : r,
        atEolAfterSecond ? "" : prefix,
        matchMode
      )
      if (domPick !== null) {
        return domPick
      }
      if (tokenIndex >= 2) {
        return null
      }
    }
  }

  return resolveFixedTokenPicker(line, cursor, firstCommandTokens, opts)
}
