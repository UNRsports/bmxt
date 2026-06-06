import type { PickerEntry, PickerSource, SearchPageMatch } from "../side-picker/model/picker-entry"
import { readTabInnerText } from "../page-extract/read-tab-inner-text"
import { isHttpUrl } from "../url/is-http-url"
import { MAX_PAGE_TEXT_CHARS } from "./limits"
import { collectPageMatchesForTab } from "./search-page-matches"
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

/**
 * EN: Attach page body hits to history/bookmark rows when the same URL is open in a tab.
 * JA: 履歴／ブックマーク行に、同一 URL の開タブ本文ヒットを後付けする。
 */
export async function enrichSearchPickerEntriesFromOpenTabs(
  entries: PickerEntry[],
  pattern: string
): Promise<PickerEntry[]> {
  const needle = pattern.trim()
  if (!needle || entries.length === 0) {
    return entries
  }

  const tabs = await chrome.tabs.query({})
  const tabByKey = new Map<string, chrome.tabs.Tab>()
  for (const tab of tabs) {
    if (tab.discarded || typeof tab.id !== "number" || !isHttpUrl(tab.url)) {
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

  const out: PickerEntry[] = []
  for (const entry of entries) {
    const key = normalizeUrlForSearchDedup(entry.url)
    const tab = tabByKey.get(key)
    if (!tab || tab.id === undefined) {
      out.push(entry)
      continue
    }

    const hasBodyHits = (entry.pageMatches ?? []).some((m) => m.lineNo > 0)
    if (hasBodyHits) {
      out.push(entry)
      continue
    }

    const text = await readTabInnerText(tab.id, MAX_PAGE_TEXT_CHARS)
    const pageMatches = collectPageMatchesForTab(tab.title ?? "", text, needle)
    const bodyMatches = pageMatches.filter((m) => m.lineNo > 0)
    if (bodyMatches.length === 0) {
      out.push(entry)
      continue
    }

    const windowId = typeof tab.windowId === "number" ? tab.windowId : undefined
    const combined = assignSnippetOccurrences([
      ...(entry.pageMatches ?? []),
      ...pageMatches
    ])
    out.push({
      ...entry,
      sources: mergeSources(entry),
      source: "page",
      tabId: tab.id,
      windowId,
      pageMatches: combined,
      id: `page-tab-${tab.id}`
    })
  }

  return out
}
