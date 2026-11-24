/**
 * EN: IME live overlay for `setting -set` key → value candidate cascade.
 * JA: `setting -set` のキー→値候補カスケード用 IME live overlay。
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
 * EN: `setting -set ` → closed key menu; `setting -set <key> ` → discrete value menu.
 * JA: `setting -set ` でキー候補、`setting -set <key> ` で離散値候補。
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
  if (tokensBefore[1]!.toLowerCase() !== "-set") {
    return null
  }

  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  if (tokensBefore.length === 2) {
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
