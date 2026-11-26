/**
 * EN: IME live overlay for `setting -set` / `-storage` / `-snapshot-storage` candidates.
 * JA: `setting -set` / `-storage` / `-snapshot-storage` の IME 候補 overlay。
 */

import { wordBounds } from "../format/word-bounds.ts"
import {
  matchCandidates,
  type CandidateMatchMode
} from "../command-line/ime-token-match.ts"
import type {
  ImeTokenPickerModel,
  ResolveImeTokenPickerOptions
} from "../command-line/ime-token-picker-model.ts"
import { SETTING_SET_KEY_TOKENS, settingSetValueCandidates } from "./setting-set-args.ts"

/**
 * EN: Closed value menus after `setting -set` / `-storage` / `-snapshot-storage`.
 * JA: `setting -set` / `-storage` / `-snapshot-storage` の閉集合値メニュー。
 */
export function resolveSettingSetImeOverlay(
  line: string,
  cursor: number,
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  if (tokensBefore.length < 2 || tokensBefore.length > 3) {
    return null
  }
  // EN: `setting` has no aliases in codegen — compare the literal first token.
  if (tokensBefore[0]!.toLowerCase() !== "setting") {
    return null
  }

  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"
  const second = tokensBefore[1]!.toLowerCase()

  if (tokensBefore.length === 2) {
    if (second === "-set") {
      const cands = matchCandidates([...SETTING_SET_KEY_TOKENS], prefix, matchMode)
      if (cands.length === 0) {
        return null
      }
      return {
        tokenStart: l,
        tokenEnd: r,
        prefix,
        candidates: cands,
        tier: "third"
      }
    }
    if (second === "-storage") {
      const cands = matchCandidates(["internal", "external"], prefix, matchMode)
      if (cands.length === 0) {
        return null
      }
      return {
        tokenStart: l,
        tokenEnd: r,
        prefix,
        candidates: cands,
        tier: "third"
      }
    }
    if (second === "-snapshot-storage") {
      const cands = matchCandidates(["bundled", "vault"], prefix, matchMode)
      if (cands.length === 0) {
        return null
      }
      return {
        tokenStart: l,
        tokenEnd: r,
        prefix,
        candidates: cands,
        tier: "third"
      }
    }
    return null
  }

  if (second !== "-set") {
    return null
  }
  const values = settingSetValueCandidates(tokensBefore[2]!)
  if (values === null || values.length === 0) {
    return null
  }
  const cands = matchCandidates([...values], prefix, matchMode)
  if (cands.length === 0) {
    return null
  }
  return {
    tokenStart: l,
    tokenEnd: r,
    prefix,
    candidates: cands,
    tier: "third"
  }
}
