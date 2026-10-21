/**
 * EN: Absolute ceiling for page body extract via CS / executeScript (DoS / memory bound).
 * JA: ページ本文抽出の絶対上限（DoS／メモリ境界）。
 */

/** EN: Hard cap for `innerText` extract (includes `search --unlimit`). */
export const ABSOLUTE_MAX_PAGE_EXTRACT_CHARS = 5_000_000

/**
 * EN: Normalize maxChars for extract. Non-finite / negative → 0 (empty).
 *     `0` (unlimit) and oversized values are clamped to the absolute ceiling.
 * JA: 抽出用 maxChars を正規化。非有限／負は 0。`0`（unlimit）と過大値は絶対上限へ。
 */
export function clampPageExtractMaxChars(maxChars: number): number {
  if (!Number.isFinite(maxChars) || maxChars < 0) {
    return 0
  }
  if (maxChars === 0) {
    return ABSOLUTE_MAX_PAGE_EXTRACT_CHARS
  }
  const floored = Math.floor(maxChars)
  if (floored <= 0) {
    return 0
  }
  return Math.min(floored, ABSOLUTE_MAX_PAGE_EXTRACT_CHARS)
}
