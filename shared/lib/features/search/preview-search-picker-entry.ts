import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"
import type { BmxtNeedleHighlightColorsPayload } from "../page-dom/page-scroll-needle-message"
import { resolveOpenTabForSearchEntry } from "./search-entry-open-tab"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import { listSearchPickerPreviewTargetIndices } from "./search-picker-preview-targets"
import { resolveSearchPickerPageMatchFromMatches, lineHitIndexForPageMatch } from "./search-picker-page-match"
import { clearSearchPageHighlights } from "./sources/clear-search-page-highlights"
import { scrollSearchPageToNeedle } from "./sources/page-scroll-to-search-needle"
import { activateTabInBackground } from "../side-picker/preview/activate-tab-in-background"

const PREVIEW_TAB_ACTIVATE_DELAY_MS = 120

export type SearchPageHighlightColors = BmxtNeedleHighlightColorsPayload

let previewSessionTabId: number | null = null
let previewSessionNeedle = ""

export function resetSearchPickerPageHighlightSession(): void {
  previewSessionTabId = null
  previewSessionNeedle = ""
}

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

function previewScrollOptions(
  match: SearchPageMatch,
  pageMatchIndex: number,
  matches: SearchPageMatch[] | undefined,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors,
  activeOnly: boolean
) {
  const lineHitIndex = lineHitIndexForPageMatch(matches, pageMatchIndex)
  return {
    searchNeedle: searchPattern.trim(),
    lineNo: match.lineNo,
    snippetHint: match.snippet,
    globalOccurrence: match.globalOccurrence,
    lineHitIndex: lineHitIndex >= 0 ? lineHitIndex : undefined,
    persistMs: 0,
    highlightColors,
    activeOnly
  }
}

async function scrollToPageMatch(
  tabId: number,
  match: SearchPageMatch,
  pageMatchIndex: number,
  matches: SearchPageMatch[] | undefined,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors
): Promise<boolean> {
  const needle = searchPattern.trim()
  if (!needle || match.lineNo <= 0) {
    return false
  }

  const sameTabAndNeedle =
    previewSessionTabId === tabId && previewSessionNeedle === needle && previewSessionTabId !== null
  const activeOnly = sameTabAndNeedle

  const markPreviewSession = () => {
    previewSessionTabId = tabId
    previewSessionNeedle = needle
  }

  const scrolled = await scrollSearchPageToNeedle(
    tabId,
    previewScrollOptions(match, pageMatchIndex, matches, searchPattern, highlightColors, activeOnly)
  )
  if (scrolled) {
    markPreviewSession()
    return true
  }

  if (activeOnly) {
    const retried = await scrollSearchPageToNeedle(
      tabId,
      previewScrollOptions(match, pageMatchIndex, matches, searchPattern, highlightColors, false)
    )
    if (retried) {
      markPreviewSession()
    }
    return retried
  }

  return false
}

async function previewPageMatchInOpenTab(
  entry: PickerEntry,
  pageMatchIndex: number,
  match: SearchPageMatch | undefined,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors
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
  if (!match || !needle || match.lineNo <= 0) {
    return true
  }

  await sleep(PREVIEW_TAB_ACTIVATE_DELAY_MS)
  return scrollToPageMatch(
    resolved.tabId,
    match,
    pageMatchIndex,
    entry.pageMatches,
    searchPattern,
    highlightColors
  )
}

/**
 * EN: Background preview at a raw `pageMatches` index (detail view hits).
 * JA: `pageMatches` の生インデックスで背面プレビュー（詳細行向け）。
 */
export async function previewSearchPickerPageMatchInBackground(
  entry: PickerEntry,
  pageMatchIndex: number,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors
): Promise<boolean> {
  return previewPageMatchInOpenTab(
    entry,
    pageMatchIndex,
    pickPageMatchAtIndex(entry, pageMatchIndex),
    searchPattern,
    highlightColors
  )
}

/** EN: Background preview for results list row + display `matchHi`. */
export async function previewSearchPickerResultsMatchInBackground(
  entry: PickerEntry,
  matchHi: number,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors
): Promise<boolean> {
  const { pageMatchIndex } = resolveSearchPickerPageMatchFromMatches(entry.pageMatches, matchHi)
  return previewSearchPickerPageMatchInBackground(
    entry,
    pageMatchIndex,
    searchPattern,
    highlightColors
  )
}

/** EN: Background preview for one detail-list row. */
export async function previewSearchPickerDetailHitInBackground(
  entry: PickerEntry,
  hit: SearchEntryDetailHit,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors
): Promise<boolean> {
  if (hit.pageMatchIndex === undefined) {
    return false
  }
  return previewSearchPickerPageMatchInBackground(
    entry,
    hit.pageMatchIndex,
    searchPattern,
    highlightColors
  )
}

/** EN: Clear in-page highlights and preview session state for an entry. */
export async function clearSearchPickerPageHighlightsForEntry(entry: PickerEntry): Promise<boolean> {
  const resolved = await resolveOpenTabForSearchEntry(entry)
  resetSearchPickerPageHighlightSession()
  if (!resolved) {
    return false
  }
  if (previewSessionTabId === resolved.tabId) {
    previewSessionTabId = null
    previewSessionNeedle = ""
  }
  return clearSearchPageHighlights(resolved.tabId)
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
