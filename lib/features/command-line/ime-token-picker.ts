/**
 * EN: IME-style token picker — first / second / third fixed tokens from manifest subcommands.
 */

import {
  getSubcommandBranches,
  isSecondToken,
  listSecondTokenCandidatesByCommand,
  listThirdTokenCandidates
} from "../builtin-commands/command-subcommands.gen"
import { resolveCanonical } from "../bmxt-core/registry"
import {
  isSearchListAwaitingScopeOrPattern,
  matchesSearchListScopeFilter,
  shouldShowSearchListPatternPlaceholder
} from "../search/search-list-picker-input"
import {
  isDomListAwaitingMoreOptionsAtEol,
  isEditingDomListOptionToken,
  listDomListRemainingOptionCandidates,
  matchesDomListOptionFilter,
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
  type CandidateMatchMode
} from "./ime-token-match"
import { mapSegmentOffsetToLine, resolveActiveCommandSegment } from "./compound/active-segment.ts"

export type { CandidateMatchMode } from "./ime-token-match"

export type ImeTokenTier = "first" | "second" | "third"

export type ResolveImeTokenPickerOptions = {
  emptyFirstPrefixShowsAll?: boolean
  candidateMatch?: CandidateMatchMode
}

export type ImeTokenPickerModel = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: ImeTokenTier
}

import { wordBounds } from "../format/word-bounds.ts"

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
  const useFullListForMatch =
    matchMode === "contains" ||
    matchesDomListOptionFilter(prefix)
  let filterMode: CandidateMatchMode = matchMode
  if (useFullListForMatch && !prefix.startsWith("--")) {
    filterMode = "contains"
  }
  const cands = pickThirdTokenCandidates(
    allRemaining,
    prefix,
    matchMode,
    useFullListForMatch,
    filterMode
  )
  if (cands.length === 0) {
    return null
  }
  return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
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
  return {
    ...picked,
    tokenStart: mapSegmentOffsetToLine(active.segmentStart, picked.tokenStart),
    tokenEnd: mapSegmentOffsetToLine(active.segmentStart, picked.tokenEnd)
  }
}

function resolveImeTokenPickerInSegment(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
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
    const canonicalSearch = resolveCanonical("search")
    if (canonicalSearch) {
      const scopeCandidates = listThirdTokenCandidates(canonicalSearch, "-list", "")
      if (scopeCandidates.length > 0) {
        return {
          tokenStart: line.length,
          tokenEnd: line.length,
          prefix: "",
          candidates: [...scopeCandidates],
          tier: "third"
        }
      }
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
        return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "first" }
      }
    }
    return null
  }

  const canonical = resolveCanonical(tokensBefore[0]!)
  if (!canonical) {
    return null
  }
  if (getSubcommandBranches(canonical).length === 0) {
    return null
  }

  if (tokenIndex === 1) {
    const secondWord = line.slice(l, r)
    const secondComplete = isSecondToken(canonical, secondWord)
    if (cursor >= line.length && secondComplete) {
      if (canonical === "dom" && secondWord.toLowerCase() === "-list") {
        const domPick = resolveDomListOptionTokenPicker(
          line,
          cursor,
          tokensBefore,
          line.length,
          line.length,
          "",
          matchMode
        )
        if (domPick) {
          return domPick
        }
      }
      const next = listThirdTokenCandidates(canonical, secondWord.toLowerCase(), "")
      if (next.length > 0) {
        return {
          tokenStart: line.length,
          tokenEnd: line.length,
          prefix: "",
          candidates: next,
          tier: "third"
        }
      }
    }
    const rawSecond =
      matchMode === "contains"
        ? listSecondTokenCandidatesByCommand(canonical, "")
        : listSecondTokenCandidatesByCommand(canonical, prefix)
    const cands = matchCandidates(rawSecond, prefix, matchMode).filter(
      (c) => !(secondComplete && c.toLowerCase() === secondWord.toLowerCase())
    )
    if (cands.length > 0) {
      return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "second" }
    }
    return null
  }

  if (tokenIndex === 2) {
    const second = tokensBefore[1]!.toLowerCase()
    if (canonical === "dom" && second === "-list") {
      const domPick = resolveDomListOptionTokenPicker(
        line,
        cursor,
        tokensBefore,
        l,
        r,
        prefix,
        matchMode
      )
      if (domPick) {
        return domPick
      }
      return null
    }
    const allThird = listThirdTokenCandidates(canonical, second, "")
    if (allThird.length === 0) {
      return null
    }
    const isSearchListScopeTier = canonical === "search" && second === "-list"
    const useFullListForMatch =
      matchMode === "contains" ||
      (isSearchListScopeTier && matchesSearchListScopeFilter(prefix))
    let filterMode: CandidateMatchMode = matchMode
    if (isSearchListScopeTier && useFullListForMatch && !prefix.startsWith("--")) {
      filterMode = "contains"
    }
    const cands = pickThirdTokenCandidates(
      allThird,
      prefix,
      matchMode,
      useFullListForMatch,
      filterMode
    )
    if (cands.length === 0) {
      return null
    }
    return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
  }

  if (tokenIndex >= 3) {
    const second = tokensBefore[1]!.toLowerCase()
    if (canonical === "dom" && second === "-list") {
      const domPick = resolveDomListOptionTokenPicker(
        line,
        cursor,
        tokensBefore,
        l,
        r,
        prefix,
        matchMode
      )
      if (domPick) {
        return domPick
      }
      return null
    }
    if (tokenIndex === 3) {
      const third = tokensBefore[2]!.toLowerCase()
      if (canonical === "tabs" && second === "-setting" && third === "-page-active") {
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
    }
  }

  return null
}