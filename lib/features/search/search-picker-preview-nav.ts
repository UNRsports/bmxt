/**
 * EN: Pure Alt-preview row navigation helpers (no Chrome APIs).
 * JA: Alt プレビュー行移動の純関数（Chrome API なし）。
 */

/** EN: Next/previous Alt-preview row from `currentHi` (skips non-open rows). */
export function adjacentSearchPickerPreviewHi(
  currentHi: number,
  direction: "up" | "down",
  previewIndices: readonly number[]
): number | null {
  if (previewIndices.length === 0) {
    return null
  }
  if (direction === "down") {
    for (const idx of previewIndices) {
      if (idx > currentHi) {
        return idx
      }
    }
    return null
  }
  for (let i = previewIndices.length - 1; i >= 0; i--) {
    const idx = previewIndices[i]!
    if (idx < currentHi) {
      return idx
    }
  }
  return null
}

/** EN: True when Alt preview nav should animate (skipped at least one row). */
export function searchPickerPreviewScrollAnimated(
  fromHi: number,
  toHi: number
): boolean {
  return Math.abs(toHi - fromHi) > 1
}
