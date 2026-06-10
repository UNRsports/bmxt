/**
 * EN: IME-style token picker — first / second / third fixed tokens from manifest subcommands.
 * JA: manifest の subcommands に基づく第一〜第三トークンの IME 風候補。
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
import { TABS_PAGE_ACTIVE_MODE_TOKENS } from "../tabs/page-active-setting"
import {
  matchCandidates,
  pickThirdTokenCandidates,
  type CandidateMatchMode
} from "./ime-token-match"

export type { CandidateMatchMode } from "./ime-token-match"

export type ImeTokenTier = "first" | "second" | "third"

export type ResolveImeTokenPickerOptions = {
  /**
   * EN: When true, an empty prefix on the first command token still yields all first-command
   * candidates (used for Tab cycling on an empty line). Default sync omits the menu until the
   * user types or presses Tab.
   * JA: 第一トークンで接頭辞が空でも全第一コマンド候補を返す（空行での Tab 巡回用）。既定の
   * 同期では、タイプまたは Tab までメニューを出さない。
   */
  emptyFirstPrefixShowsAll?: boolean
  /**
   * EN: `prefix` — token starts with typed text; `contains` — typed text appears anywhere in the
   * candidate (used while the completion menu is visible).
   * JA: `prefix` は先頭一致、`contains` は候補文字列内の部分一致（メニュー表示中）。
   */
  candidateMatch?: CandidateMatchMode
}

export type ImeTokenPickerModel = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: ImeTokenTier
}

function tokenBounds(s: string, pos: number): [number, number] {
  let l = pos
  while (l > 0 && !/\s/.test(s[l - 1]!)) {
    l--
  }
  let r = pos
  while (r < s.length && !/\s/.test(s[r]!)) {
    r++
  }
  return [l, r]
}

export function imeTokenPickerHint(tier: ImeTokenTier): string {
  switch (tier) {
    case "first":
      return "Command · ↑↓ · Tab · Enter · Esc — 第一コマンド"
    case "second":
      return "Subcommand · ↑↓ · Tab · Enter · Esc — 第二コマンド"
    case "third":
      return "Option · ↑↓ · Tab · Enter · Esc — オプション"
  }
}

/** EN: Resolve dropdown candidates for the token under `cursor` (prefix-filtered). */
export function resolveImeTokenPicker(
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

  const [l, r] = tokenBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  const tokenIndex = tokensBefore.length
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  if (tokenIndex === 0) {
    const allowEmptyFirstAll = opts?.emptyFirstPrefixShowsAll === true
    if (prefix.length > 0 || allowEmptyFirstAll) {
      const cands = matchCandidates(firstCommandTokens, prefix, matchMode)
      if (cands.length > 0) {
        return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "first" }
      }
    }
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

  if (tokenIndex === 3) {
    const second = tokensBefore[1]!.toLowerCase()
    const third = tokensBefore[2]!.toLowerCase()
    if (canonical === "tabs" && second === "-setting" && third === "-page-active") {
      const cands = matchCandidates(TABS_PAGE_ACTIVE_MODE_TOKENS, prefix, matchMode)
      if (cands.length === 0) {
        return null
      }
      return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
    }
  }

  return null
}
