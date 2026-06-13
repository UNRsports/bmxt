import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"
import { resolveOpenTabForSearchEntry } from "./search-entry-open-tab"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import { listSearchPickerPreviewTargetIndices } from "./search-picker-preview-targets"
import { pickPageMatchForDisplay } from "./search-picker-page-match"
import { scrollSearchPageToNeedle } from "./sources/page-scroll-to-search-needle"
import { scrollSearchPageToSnippet } from "./sources/page-scroll-to-snippet"
import { activateTabInBackground } from "../side-picker/preview/activate-tab-in-background"

const PREVIEW_TAB_ACTIVATE_DELAY_MS = 120

function pickPageMatchAtIndex(
  entry: PickerEntry,
  pageMatchIndex: number
): SearchPageMatch | undefined {
  const matches = entry.pageMatches
  if (!matches || pageMatchIndex < 0 || pageMatchIndex >= matches.length) {
    return undefined
  }
  return matches[pageMatchIndex]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function scrollToPageMatch(
  tabId: number,
  match: SearchPageMatch,
  searchPattern: string
): Promise<boolean> {
  const needle = searchPattern.trim()
  if (!needle) {
    return false
  }

  const scrolled = await scrollSearchPageToNeedle(tabId, {
    searchNeedle: needle,
    lineNo: match.lineNo,
    snippetHint: match.snippet,
    globalOccurrence: match.globalOccurrence
  })
  if (scrolled) {
    return true
  }

  const snippet = match.snippet.trim()
  if (snippet.length > 0) {
    return scrollSearchPageToSnippet(tabId, snippet, match.occurrence)
  }
  return false
}

async function previewPageMatchInOpenTab(
  entry: PickerEntry,
  match: SearchPageMatch | undefined,
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

  const needle = searchPattern.trim()
  if (!match || !needle) {
    return true
  }

  await sleep(PREVIEW_TAB_ACTIVATE_DELAY_MS)
  return scrollToPageMatch(resolved.tabId, match, searchPattern)
}

/**
 * EN: Background preview at a raw `pageMatches` index (detail view hits).
 * JA: `pageMatches` の生インデックスで背面プレビュー（詳細行向け）。
 */
export async function previewSearchPickerPageMatchInBackground(
  entry: PickerEntry,
  pageMatchIndex: number,
  searchPattern: string
): Promise<boolean> {
  return previewPageMatchInOpenTab(
    entry,
    pickPageMatchAtIndex(entry, pageMatchIndex),
    searchPattern
  )
}

/** EN: Background preview for one detail-list row. */
export async function previewSearchPickerDetailHitInBackground(
  entry: PickerEntry,
  hit: SearchEntryDetailHit,
  searchPattern: string
): Promise<boolean> {
  if (hit.pageMatchIndex === undefined) {
    return false
  }
  return previewSearchPickerPageMatchInBackground(entry, hit.pageMatchIndex, searchPattern)
}

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
  return previewPageMatchInOpenTab(
    entry,
    pickPageMatchForDisplay(entry.pageMatches, matchIndex),
    searchPattern
  )
}

/** EN: True when at least one entry has an open scriptable tab for preview. */
export async function anySearchPickerPreviewTarget(
  entries: readonly PickerEntry[]
): Promise<boolean> {
  const indices = await listSearchPickerPreviewTargetIndices(entries)
  return indices.length > 0
}

export { listSearchPickerPreviewTargetIndices } from "./search-picker-preview-targets"

export type { SearchPageMatch }
