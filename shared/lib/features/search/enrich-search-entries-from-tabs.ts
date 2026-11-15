import type { PickerEntry, PickerSource, SearchPageMatch } from "../side-picker/model/picker-entry"
import { collectPageMatchesFromOpenTab } from "../page-extract/collect-tab-page-matches"
import { MAX_ENRICH_OPEN_TAB_ENTRIES, MAX_MATCHES_PER_TAB, PAGE_SCAN_PREFIX_CHARS } from "./limits.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import { normalizeUrlForSearchDedup } from "./search-url-dedup"

const SEARCH_SOURCES: PickerSource[] = ["history", "bookmark", "page"]

function mergeSources(entry: PickerEntry): PickerSource[] {
  const merged = new Set<PickerSource>(entry.sources ?? [entry.source])
  merged.add("page")
  return SEARCH_SOURCES.filter((s) => merged.has(s))
}

function assignSnippetOccurrences(matches: SearchPageMatch[]): SearchPageMatch[] {
  const counts = new Map<string, number>()
  return matches.map((m) => {
    const key = m.snippet.toLowerCase()
    const occurrence = counts.get(key) ?? 0
    counts.set(key, occurrence + 1)
    return { ...m, occurrence }
  })
}

function preferRicherMatches(
  current: SearchPageMatch[] | undefined,
  next: SearchPageMatch[]
): SearchPageMatch[] {
  const curBody = (current ?? []).filter((m) => m.lineNo > 0).length
  const nextBody = next.filter((m) => m.lineNo > 0).length
  if (nextBody > curBody) {
    return assignSnippetOccurrences(next)
  }
  if (nextBody === curBody && next.length > (current?.length ?? 0)) {
    return assignSnippetOccurrences(next)
  }
  return current ?? next
}

/**
 * EN: Attach page body hits to history/bookmark rows when the same URL is open in a tab.
 *     Uses in-tab match collection (compact rows) — not a full innerText transfer.
 * JA: 履歴／ブックマーク行に、同一 URL の開タブ本文ヒットを後付けする。
 *     本文全文ではなくタブ内マッチ収集を使う。
 */
export async function enrichSearchPickerEntriesFromOpenTabs(
  entries: PickerEntry[],
  pattern: string,
  maxPageTextChars?: number
): Promise<PickerEntry[]> {
  const needle = pattern.trim()
  if (!needle || entries.length === 0) {
    return entries
  }

  const tabs = await chrome.tabs.query({})
  const tabByKey = new Map<string, chrome.tabs.Tab>()
  for (const tab of tabs) {
    if (tab.discarded || typeof tab.id !== "number" || !isScriptablePageUrl(tab.url)) {
      continue
    }
    const key = normalizeUrlForSearchDedup(tab.url)
    if (!tabByKey.has(key)) {
      tabByKey.set(key, tab)
    }
  }

  if (tabByKey.size === 0) {
    return entries
  }

  const readMaxChars =
    maxPageTextChars === 0
      ? 0
      : maxPageTextChars !== undefined
        ? maxPageTextChars
        : PAGE_SCAN_PREFIX_CHARS

  const out: PickerEntry[] = []
  let enrichedCount = 0
  for (const entry of entries) {
    const key = normalizeUrlForSearchDedup(entry.url)
    const tab = tabByKey.get(key)
    if (!tab || tab.id === undefined) {
      out.push(entry)
      continue
    }

    if (enrichedCount >= MAX_ENRICH_OPEN_TAB_ENTRIES) {
      out.push(entry)
      continue
    }

    const collected = await collectPageMatchesFromOpenTab(tab, needle, {
      maxMatches: MAX_MATCHES_PER_TAB,
      maxTextChars: readMaxChars
    })
    if (collected === null || collected.matches.length === 0) {
      out.push(entry)
      continue
    }

    const bodyMatches = collected.matches.filter((m) => m.lineNo > 0)
    if (bodyMatches.length === 0) {
      out.push(entry)
      continue
    }

    const windowId = typeof tab.windowId === "number" ? tab.windowId : undefined
    enrichedCount += 1
    out.push({
      ...entry,
      sources: mergeSources(entry),
      source: "page",
      tabId: tab.id,
      windowId,
      pageMatches: preferRicherMatches(entry.pageMatches, collected.matches),
      id: `page-tab-${tab.id}`
    })
  }

  return out
}
