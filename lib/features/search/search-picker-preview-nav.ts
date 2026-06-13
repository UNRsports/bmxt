/**
 * EN: Pure row-navigation helpers for search picker (no Chrome APIs).
 * JA: search ピッカー行移動の純関数（Chrome API なし）。
 */

import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import type { SearchPageMatch } from "../side-picker/model/picker-entry"

/** EN: Detail rows with in-page scroll targets (body `pageMatchIndex`). */
export function listSearchDetailScrollTargetIndices(
  hits: readonly SearchEntryDetailHit[],
  pageMatches?: readonly SearchPageMatch[]
): number[] {
  const indices: number[] = []
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]
    const pageMatchIndex = hit?.pageMatchIndex
    if (pageMatchIndex === undefined) {
      continue
    }
    const match = pageMatches?.[pageMatchIndex]
    if (!match || match.lineNo <= 0) {
      continue
    }
    indices.push(i)
  }
  return indices
}

/** EN: Next/previous open-tab row from `currentHi` (skips closed-tab rows). */
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

/** EN: Whether the current picker row can be Alt-previewed in background. */
export function canPreviewSearchPickerSelection(
  view: "results" | "detail",
  hi: number,
  previewTargetIndices: readonly number[],
  detailHits: readonly SearchEntryDetailHit[],
  pageMatches?: readonly SearchPageMatch[]
): boolean {
  if (previewTargetIndices.includes(hi)) {
    return true
  }
  if (view !== "detail") {
    return false
  }
  const hit = detailHits[hi]
  const pageMatchIndex = hit?.pageMatchIndex
  if (pageMatchIndex === undefined) {
    return false
  }
  const match = pageMatches?.[pageMatchIndex]
  return match != null && match.lineNo > 0
}
