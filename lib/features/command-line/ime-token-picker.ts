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
  isFindListReadyToRun,
  isEditingFindListScopeToken
} from "../find/find-list-picker-input"

export type ImeTokenTier = "first" | "second" | "third"

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
  firstCommandTokens: readonly string[]
): ImeTokenPickerModel | null {
  const trimmed = line.trim()
  if (isFindListReadyToRun(trimmed) && !isEditingFindListScopeToken(line, cursor)) {
    return null
  }

  const [l, r] = tokenBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  const tokenIndex = tokensBefore.length
  const prefix = line.slice(l, cursor)

  if (tokenIndex === 0) {
    const p = prefix.toLowerCase()
    const cands = firstCommandTokens.filter((c) => c.toLowerCase().startsWith(p))
    if (cands.length > 0) {
      return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "first" }
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
    const cands = listSecondTokenCandidatesByCommand(canonical, prefix)
    if (cands.length > 0) {
      return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "second" }
    }
    const secondWord = line.slice(l, r)
    if (cursor >= line.length && isSecondToken(canonical, secondWord)) {
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
    return null
  }

  if (tokenIndex === 2) {
    const second = tokensBefore[1]!.toLowerCase()
    const cands = listThirdTokenCandidates(canonical, second, prefix)
    if (cands.length === 0) {
      return null
    }
    return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
  }

  return null
}
