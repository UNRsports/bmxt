/** EN: Shared `/` match helpers for tree pickers (history / bookmark). */

import {
  parsePickerSearchNeedle,
  splitTextHighlightSegments
} from "../search/picker-search-needle.ts"
import type { TreePickerRowView } from "./tree-picker-types.ts"

/**
 * EN: Tabs-compatible field match — `@` → detail/URL only on leaf rows; else label only.
 * JA: tabs と同じ照合 — `@` は葉の detail/URL のみ、それ以外は label のみ。
 */
export function treePickerViewMatchesNeedle(
  view: TreePickerRowView,
  byUrl: boolean,
  lcNeedle: string
): boolean {
  if (byUrl) {
    if (view.variant !== "tab" || view.detail === null) {
      return false
    }
    return view.detail.toLowerCase().includes(lcNeedle)
  }
  return view.label.toLowerCase().includes(lcNeedle)
}

/** EN: View indices matching the highlight query (for `n`/`N`). Empty needle → []. */
export function treePickerVisibleHiIndicesMatching(
  views: readonly TreePickerRowView[],
  searchHighlightQuery: string
): number[] {
  const { byUrl, needle } = parsePickerSearchNeedle(searchHighlightQuery)
  if (needle === "") {
    return []
  }
  const lc = needle.toLowerCase()
  const out: number[] = []
  for (let i = 0; i < views.length; i += 1) {
    if (treePickerViewMatchesNeedle(views[i]!, byUrl, lc)) {
      out.push(i)
    }
  }
  return out
}

/** EN: Highlight segments for tree row label/detail (same mark class as tabs). */
export function treePickerHighlightSegments(
  text: string,
  searchHighlightQuery: string,
  field: "label" | "detail"
): Array<{ text: string; match: boolean }> {
  const { byUrl, needle } = parsePickerSearchNeedle(searchHighlightQuery)
  if (needle === "") {
    return [{ text, match: false }]
  }
  if (byUrl && field === "label") {
    return [{ text, match: false }]
  }
  if (!byUrl && field === "detail") {
    return [{ text, match: false }]
  }
  return splitTextHighlightSegments(text, needle)
}
