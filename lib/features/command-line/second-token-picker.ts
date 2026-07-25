/**
 * EN: Second-token (subcommand head) candidate resolution for the IME menu.
 * Host filters the full head list so option-body / contains search works while the menu is open.
 */

import {
  getSubcommandBranches,
  isSecondToken,
  listSecondTokenCandidatesByCommand,
  listThirdTokenCandidates
} from "../builtin-commands/command-subcommands.gen.ts"
import { COMMANDS } from "../bmxt-core/registry/table.gen.ts"
import { wordBounds } from "../format/word-bounds.ts"
import {
  matchCandidates,
  resolveOptionTokenFilterModes,
  type CandidateMatchMode
} from "./ime-token-match.ts"
import type { ImeTokenPickerModel } from "./ime-token-picker-model.ts"

export type { ImeTokenPickerModel }

function resolveCanonical(cmd: string): string | null {
  const k = cmd.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name === k) {
      return c.name
    }
    for (const a of c.aliases) {
      if (a.toLowerCase() === k) {
        return c.name
      }
    }
  }
  return null
}

/**
 * EN: Cursor is at/after a complete second token with no further fixed-token menu
 *     (e.g. `tab -nowurl` / `tab -nowurl `). Empty-filter keep-alive must not leave a hollow popup.
 */
export function isCompleteSecondTokenWithoutFurtherFixedTokens(
  line: string,
  cursor: number
): boolean {
  if (cursor < line.length && !/^\s*$/.test(line.slice(cursor))) {
    return false
  }
  const parts = line.trim().split(/\s+/).filter(Boolean)
  if (parts.length !== 2) {
    return false
  }
  const canonical = resolveCanonical(parts[0]!)
  if (!canonical || getSubcommandBranches(canonical).length === 0) {
    return false
  }
  const second = parts[1]!
  if (!isSecondToken(canonical, second)) {
    return false
  }
  return listThirdTokenCandidates(canonical, second.toLowerCase(), "").length === 0
}

/**
 * EN: Second-token menu while open must filter the full head list (option-body / contains).
 * WASM `complete` only prefix-matches the dashed form and returns null for `r` → `-reload`.
 *
 * Also covers complete first command at EOL without a trailing space (`tab` + Tab): same as
 * WASM `complete_line` when `token_index == 0` and the word is a known first command.
 */
export function resolveSecondTokenPickerHit(
  line: string,
  cursor: number,
  matchMode: CandidateMatchMode
): ImeTokenPickerModel | null {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []

  // EN: `tab` (no trailing space) at EOL — offer second heads for insert at end of line.
  if (tokensBefore.length === 0) {
    const cmdWord = line.slice(l, r)
    const canonical0 = resolveCanonical(cmdWord)
    if (
      !canonical0 ||
      cursor < line.length ||
      getSubcommandBranches(canonical0).length === 0
    ) {
      return null
    }
    const rawSecond = listSecondTokenCandidatesByCommand(canonical0, "")
    if (rawSecond.length === 0) {
      return null
    }
    return {
      tokenStart: line.length,
      tokenEnd: line.length,
      prefix: "",
      candidates: rawSecond,
      tier: "second"
    }
  }

  if (tokensBefore.length !== 1) {
    return null
  }
  const canonical = resolveCanonical(tokensBefore[0]!)
  if (!canonical || getSubcommandBranches(canonical).length === 0) {
    return null
  }
  const prefix = line.slice(l, cursor)
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
    // EN: Complete second with no third fixed tokens → close menu (do not offer sibling heads).
    return null
  }
  const rawSecond = listSecondTokenCandidatesByCommand(canonical, "")
  const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
    rawSecond,
    prefix,
    matchMode
  )
  const source = useFullCandidateList
    ? rawSecond
    : matchCandidates(rawSecond, prefix, "prefix")
  const cands = matchCandidates(source, prefix, filterMode).filter(
    (c) => !(secondComplete && c.toLowerCase() === secondWord.toLowerCase())
  )
  if (cands.length === 0) {
    return null
  }
  return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "second" }
}
