import type { PickerEntry } from "../side-picker/model/picker-entry"
import { matchesNeedle } from "./matcher"
import { excerptAroundNeedle } from "./search-picker-excerpt"

/** EN: One searchable hit row inside the search picker detail view. */
export type SearchEntryDetailHit = {
  field: "title" | "url" | "text"
  /** EN: Shown in the detail list (may include `L{n}:` prefix for body lines). */
  displayText: string
  /** EN: Index into `entry.pageMatches` when the hit came from page scan. */
  pageMatchIndex?: number
  /** EN: Body line hits can scroll in-tab when `tabId` is present. */
  canScrollTo: boolean
}

function pushUniqueTitleOrUrl(
  hits: SearchEntryDetailHit[],
  field: "title" | "url",
  text: string
): void {
  const trimmed = text.trim()
  if (!trimmed) {
    return
  }
  const duplicate = hits.some((h) => h.field === field && h.displayText === trimmed)
  if (duplicate) {
    return
  }
  hits.push({ field, displayText: trimmed, canScrollTo: false })
}

/**
 * EN: All pattern hits for one search picker row — title, url, and page body lines.
 * JA: 検索結果 1 行分のヒット（タイトル・URL・本文行）を詳細一覧用に列挙する。
 */
export function listSearchEntryDetailHits(
  entry: PickerEntry,
  pattern: string
): SearchEntryDetailHit[] {
  const needle = pattern.trim()
  const matches = entry.pageMatches ?? []
  const hits: SearchEntryDetailHit[] = []

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]!
      if (m.lineNo > 0) {
        const excerpt = excerptAroundNeedle(m.snippet, needle)
        hits.push({
          field: "text",
          displayText: `L${m.lineNo}: ${excerpt}`,
          pageMatchIndex: i,
          canScrollTo: entry.tabId != null
        })
        continue
      }
      const titleText = m.snippet.trim() || entry.title.trim() || entry.url
      hits.push({
        field: "title",
        displayText: titleText,
        pageMatchIndex: i,
        canScrollTo: entry.tabId != null
      })
    }
    return hits
  }

  const titleText = entry.title.trim() || entry.url
  if (!needle || matchesNeedle(titleText, needle)) {
    pushUniqueTitleOrUrl(hits, "title", titleText)
  }

  const url = entry.url.trim()
  if (url && (!needle || matchesNeedle(url, needle))) {
    pushUniqueTitleOrUrl(hits, "url", url)
  }

  return hits
}
