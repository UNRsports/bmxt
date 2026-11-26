import type { TokenPickerModel } from "../token-picker-panel"

/**
 * EN: True when the IME token slot and candidate list are unchanged (identity-safe skip).
 * JA: スロットと候補列が変わっていないとき true（identity 維持して再レンダーを避ける）。
 */
export function isSameImeTokenPickerSlot(
  prev: TokenPickerModel | null,
  next: {
    tokenStart: number
    tokenEnd: number
    tier: TokenPickerModel["tier"]
    candidates: readonly string[]
  }
): boolean {
  if (prev === null) {
    return false
  }
  if (
    prev.tokenStart !== next.tokenStart ||
    prev.tokenEnd !== next.tokenEnd ||
    prev.tier !== next.tier ||
    prev.candidates.length !== next.candidates.length
  ) {
    return false
  }
  return prev.candidates.every((c, i) => c === next.candidates[i])
}
