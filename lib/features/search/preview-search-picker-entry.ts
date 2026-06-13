import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"
import { resolveOpenTabForSearchEntry } from "./search-entry-open-tab"
import { pickPageMatchForDisplay } from "./search-picker-page-match"
import { scrollSearchPageToNeedle } from "./sources/page-scroll-to-search-needle"
import { activateTabInBackground } from "../side-picker/preview/activate-tab-in-background"

/**
 * EN: Background preview for a search picker row — activate tab without focusing window,
 *     then scroll/highlight the page match when available.
 * JA: search ピッカー行の背面プレビュー — ウィンドウを前面化せずタブ切替、page ヒットがあればスクロール。
 */
export async function previewSearchPickerEntryInBackground(
  entry: PickerEntry,
  matchIndex: number,
  searchPattern: string
): Promise<boolean> {
  const resolved = await resolveOpenTabForSearchEntry(entry)
  if (!resolved) {
    return false
  }

  const activated = await activateTabInBackground(resolved.tabId)
  if (!activated) {
    return false
  }

  const match = pickPageMatchForDisplay(entry.pageMatches, matchIndex)
  const needle = searchPattern.trim()
  if (!match || !needle) {
    return true
  }

  return scrollSearchPageToNeedle(resolved.tabId, {
    searchNeedle: needle,
    lineNo: match.lineNo,
    snippetHint: match.snippet
  })
}

/** EN: True when at least one entry has an open scriptable tab for preview. */
export async function anySearchPickerPreviewTarget(
  entries: readonly PickerEntry[]
): Promise<boolean> {
  for (const entry of entries) {
    if (await resolveOpenTabForSearchEntry(entry)) {
      return true
    }
  }
  return false
}

export type { SearchPageMatch }
