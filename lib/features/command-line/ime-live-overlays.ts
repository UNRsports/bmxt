/**
 * EN: Host IME overlays for live command-line UI (not WASM fixed-token complete).
 */

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
import { TABS_PAGE_ACTIVE_MODE_TOKENS } from "../tabs/page-active-setting"
import { DOM_PAGE_ACTIVE_MODE_TOKENS } from "../dom/page-active-setting"
import { PICKER_LIST_PRODUCER_TOKENS } from "../picker/list-producers.ts"
import { wordBounds } from "../format/word-bounds.ts"
import { isSecondToken } from "../builtin-commands/command-subcommands.gen"
import {
  matchCandidates,
  pickThirdTokenCandidates,
  resolveOptionTokenFilterModes,
  type CandidateMatchMode
} from "./ime-token-match"
import type {
  ImeTokenPickerModel,
  ImeTokenTier,
  ResolveImeTokenPickerOptions
} from "./ime-token-picker-model.ts"

export type ImeLiveOverlayProvider = {
  /** Opaque source id (not a command name). */
  id: string
  resolve: (
    line: string,
    cursor: number,
    opts?: ResolveImeTokenPickerOptions
  ) => ImeTokenPickerModel | null
}

export type ImeLiveOverlayResolveResult =
  | { type: "pick"; model: ImeTokenPickerModel }
  | { type: "suppress" }
  | { type: "none" }

type ImeLiveOverlayContext = {
  firstCommandTokens: readonly string[]
  resolveNestedSegment: (
    line: string,
    cursor: number,
    firstCommandTokens: readonly string[],
    opts?: ResolveImeTokenPickerOptions
  ) => ImeTokenPickerModel | null
  resolveFixedTokenPicker: (
    line: string,
    cursor: number,
    firstCommandTokens: readonly string[],
    opts?: ResolveImeTokenPickerOptions
  ) => ImeTokenPickerModel | null
}

let overlayContext: ImeLiveOverlayContext | null = null

export function runWithImeLiveOverlayContext<T>(
  ctx: ImeLiveOverlayContext,
  fn: () => T
): T {
  const prev = overlayContext
  overlayContext = ctx
  try {
    return fn()
  } finally {
    overlayContext = prev
  }
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

function resolveBrowseProducerOverlayResult(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeLiveOverlayResolveResult {
  const ctx = overlayContext
  if (ctx === null) {
    return { type: "none" }
  }

  const prefixMatch = /^(\s*)browse(\s+)/i.exec(line)
  if (prefixMatch !== null) {
    const producerStart = prefixMatch[0].length
    if (cursor >= producerStart) {
      const producerLine = line.slice(producerStart)
      const producerCursor = cursor - producerStart

      if (producerLine.trim().length === 0) {
        return {
          type: "pick",
          model: {
            tokenStart: producerStart,
            tokenEnd: producerStart,
            prefix: "",
            candidates: [...PICKER_LIST_PRODUCER_TOKENS],
            tier: "second"
          }
        }
      }

      const picked = ctx.resolveNestedSegment(producerLine, producerCursor, PICKER_LIST_PRODUCER_TOKENS, {
        ...opts,
        emptyFirstPrefixShowsAll: true
      })
      if (picked !== null) {
        return {
          type: "pick",
          model: {
            ...picked,
            tokenStart: picked.tokenStart + producerStart,
            tokenEnd: picked.tokenEnd + producerStart,
            tier: remapPickerProducerTier(picked.tier)
          }
        }
      }
    }
  }

  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  if (tokensBefore.length === 0) {
    const cmdWord = line.slice(l, r)
    if (resolveCanonical(cmdWord) === "browse" && cursor >= line.length) {
      return {
        type: "pick",
        model: {
          tokenStart: line.length,
          tokenEnd: line.length,
          prefix: "",
          candidates: [...PICKER_LIST_PRODUCER_TOKENS],
          tier: "second"
        }
      }
    }
  }

  return { type: "none" }
}

function resolvePageActiveModeOverlayResult(
  line: string,
  cursor: number
): ImeLiveOverlayResolveResult {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  if (tokensBefore.length !== 3) {
    return { type: "none" }
  }
  const canonical = resolveCanonical(tokensBefore[0]!)
  const second = tokensBefore[1]!.toLowerCase()
  const third = tokensBefore[2]!.toLowerCase()
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = "prefix"
  if (canonical === "tab" && second === "-setting" && third === "-page-active") {
    const cands = matchCandidates(TABS_PAGE_ACTIVE_MODE_TOKENS, prefix, matchMode)
    if (cands.length === 0) {
      return { type: "none" }
    }
    return { type: "pick", model: { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" } }
  }
  if (canonical === "dom" && second === "-setting" && third === "-page-active") {
    const cands = matchCandidates(DOM_PAGE_ACTIVE_MODE_TOKENS, prefix, matchMode)
    if (cands.length === 0) {
      return { type: "none" }
    }
    return { type: "pick", model: { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" } }
  }
  return { type: "none" }
}

function resolveDomListOptionTokenOverlay(
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

function resolveDomListOverlayResult(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeLiveOverlayResolveResult {
  if (shouldShowDomListPatternPlaceholder(line, cursor) && !isDomListAwaitingMoreOptionsAtEol(line)) {
    return { type: "suppress" }
  }

  if (isDomListAwaitingMoreOptionsAtEol(line) && cursor >= line.length) {
    const parts = line.trim().split(/\s+/).filter(Boolean)
    const cands = listDomListRemainingOptionCandidates(parts.slice(2), "")
    if (cands.length > 0) {
      return {
        type: "pick",
        model: {
          tokenStart: line.length,
          tokenEnd: line.length,
          prefix: "",
          candidates: [...cands],
          tier: "third"
        }
      }
    }
  }

  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  const tokenIndex = tokensBefore.length
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  if (tokenIndex >= 1) {
    const canonical = resolveCanonical(tokensBefore[0]!)
    if (canonical === "dom" && tokensBefore[1]?.toLowerCase() === "-list") {
      const atEolAfterSecond =
        tokenIndex === 1 && cursor >= line.length && isSecondToken(canonical, line.slice(l, r))
      const domPick = resolveDomListOptionTokenOverlay(
        line,
        cursor,
        tokensBefore,
        atEolAfterSecond ? line.length : l,
        atEolAfterSecond ? line.length : r,
        atEolAfterSecond ? "" : prefix,
        matchMode
      )
      if (domPick !== null) {
        return { type: "pick", model: domPick }
      }
      if (tokenIndex >= 2) {
        return { type: "suppress" }
      }
    }
  }

  return { type: "none" }
}

function resolveSearchListOverlayResult(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeLiveOverlayResolveResult {
  const ctx = overlayContext
  if (ctx === null) {
    return { type: "none" }
  }

  if (
    shouldShowSearchListPatternPlaceholder(line, cursor) &&
    !isSearchListAwaitingScopeOrPattern(line)
  ) {
    return { type: "suppress" }
  }

  if (isSearchListAwaitingScopeOrPattern(line) && cursor >= line.length) {
    const fixed = ctx.resolveFixedTokenPicker(line, cursor, ctx.firstCommandTokens, opts)
    if (fixed !== null && fixed.tier === "third") {
      return { type: "pick", model: fixed }
    }
  }

  return { type: "none" }
}

type ImeLiveOverlayProviderImpl = {
  id: string
  resolveResult: (
    line: string,
    cursor: number,
    opts?: ResolveImeTokenPickerOptions
  ) => ImeLiveOverlayResolveResult
}

const IME_LIVE_OVERLAY_PROVIDER_IMPLS: readonly ImeLiveOverlayProviderImpl[] = [
  { id: "browse-producer", resolveResult: resolveBrowseProducerOverlayResult },
  { id: "page-active-mode", resolveResult: resolvePageActiveModeOverlayResult },
  { id: "dom-list-options", resolveResult: resolveDomListOverlayResult },
  { id: "search-list-scope", resolveResult: resolveSearchListOverlayResult }
]

export const IME_LIVE_OVERLAY_PROVIDERS: readonly ImeLiveOverlayProvider[] =
  IME_LIVE_OVERLAY_PROVIDER_IMPLS.map((provider) => ({
    id: provider.id,
    resolve: (line, cursor, opts) => {
      const result = provider.resolveResult(line, cursor, opts)
      return result.type === "pick" ? result.model : null
    }
  }))

export function resolveImeLiveOverlayResult(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeLiveOverlayResolveResult {
  for (const provider of IME_LIVE_OVERLAY_PROVIDER_IMPLS) {
    const result = provider.resolveResult(line, cursor, opts)
    if (result.type === "pick" || result.type === "suppress") {
      return result
    }
  }
  return { type: "none" }
}

export function resolveImeLiveOverlay(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const result = resolveImeLiveOverlayResult(line, cursor, opts)
  return result.type === "pick" ? result.model : null
}
