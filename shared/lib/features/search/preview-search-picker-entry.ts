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
/** EN: Coalesce concurrent full Range collects for the same tab+needle (huge DOMs). */
let previewWarmInFlight: Promise<boolean> | null = null
let previewWarmKey = ""
/** EN: Serialize page paints; skip superseded preview generations (stale yellow jump). */
let previewScrollGeneration = 0
let previewScrollTail: Promise<void> = Promise.resolve()

export function resetSearchPickerPageHighlightSession(): void {
  previewSessionTabId = null
  previewSessionNeedle = ""
  previewWarmInFlight = null
  previewWarmKey = ""
  previewScrollGeneration += 1
}

function previewSessionKey(tabId: number, needle: string): string {
  return `${tabId}\0${needle}`
}

function isPreviewSessionReady(tabId: number, needle: string): boolean {
  return previewSessionTabId === tabId && previewSessionNeedle === needle
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

async function scrollToPageMatchUnqueued(
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

  const markPreviewSession = () => {
    previewSessionTabId = tabId
    previewSessionNeedle = needle
  }

  const runScroll = (activeOnly: boolean): Promise<boolean> => {
    return scrollSearchPageToNeedle(
      tabId,
      previewScrollOptions(match, pageMatchIndex, matches, searchPattern, highlightColors, activeOnly)
    )
  }

  if (isPreviewSessionReady(tabId, needle)) {
    const scrolled = await runScroll(true)
    if (scrolled) {
      return true
    }
    // EN: Content-script session may have been cleared — rebuild once.
    const rebuilt = await runScroll(false)
    if (rebuilt) {
      markPreviewSession()
    }
    return rebuilt
  }

  const key = previewSessionKey(tabId, needle)

  // EN: Wait for an in-flight full collect, then jump with cached ranges (activeOnly).
  if (previewWarmInFlight !== null && previewWarmKey === key) {
    await previewWarmInFlight
    if (isPreviewSessionReady(tabId, needle)) {
      const afterWarm = await runScroll(true)
      if (afterWarm) {
        return true
      }
    }
  }

  previewWarmKey = key
  const warmPromise = (async (): Promise<boolean> => {
    const scrolled = await runScroll(false)
    if (scrolled) {
      markPreviewSession()
    }
    return scrolled
  })()
  previewWarmInFlight = warmPromise
  try {
    return await warmPromise
  } finally {
    if (previewWarmInFlight === warmPromise) {
      previewWarmInFlight = null
    }
  }
}

/**
 * EN: Queue preview paints so a slower older jump cannot overwrite a newer highlight.
 * JA: 古いプレビューが新しい黄ハイライトを上書きしないよう直列化する。
 */
async function scrollToPageMatch(
  tabId: number,
  match: SearchPageMatch,
  pageMatchIndex: number,
  matches: SearchPageMatch[] | undefined,
  searchPattern: string,
  highlightColors: SearchPageHighlightColors
): Promise<boolean> {
  const generation = ++previewScrollGeneration
  const run = previewScrollTail.then(async () => {
    if (generation !== previewScrollGeneration) {
      return false
    }
    return scrollToPageMatchUnqueued(
      tabId,
      match,
      pageMatchIndex,
      matches,
      searchPattern,
      highlightColors
    )
  })
  previewScrollTail = run.then(
    () => undefined,
    () => undefined
  )
  return run
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

  const needle = searchPattern.trim()
  const skipActivateDelay =
    needle.length > 0 && isPreviewSessionReady(resolved.tabId, needle)

  const activated = await activateTabInBackground(resolved.tabId)
  if (!activated) {
    return false
  }

  if (!match || !needle || match.lineNo <= 0) {
    return true
  }

  if (!skipActivateDelay) {
    await sleep(PREVIEW_TAB_ACTIVATE_DELAY_MS)
  }
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
