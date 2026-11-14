import type { PickerEntry } from "../side-picker/model/picker-entry.ts"
import { matchesNeedle } from "./matcher.ts"
import {
  excerptAroundNeedleWithHighlight,
  SEARCH_PICKER_TEXT_CONTEXT_CHARS
} from "./search-picker-excerpt.ts"

/** EN: One searchable hit row inside the search picker detail view. */
export type SearchEntryDetailHit = {
  field: "title" | "url" | "text"
  /** EN: Shown in the detail list (may include `L{n}:` prefix for body lines). */
  displayText: string
  /** EN: Index into `entry.pageMatches` when the hit came from page scan. */
  pageMatchIndex?: number
  /**
   * EN: 0-based needle occurrence inside `displayText` to mark exclusively.
   * JA: `displayText` 内でこの行が担当する needle 出現（0 始まり）のみ強調する。
   */
  highlightOccurrence?: number
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
  hits.push({
    field,
    displayText: trimmed,
    highlightOccurrence: 0,
    canScrollTo: false
  })
}

function countNeedleOccurrences(haystack: string, needle: string): number {
  const lower = haystack.toLowerCase()
  const nLower = needle.toLowerCase()
  if (!nLower) {
    return 0
  }
  let from = 0
  let count = 0
  while (from < haystack.length) {
    const idx = lower.indexOf(nLower, from)
    if (idx < 0) {
      break
    }
    count += 1
    from = idx + Math.max(1, needle.length)
  }
  return count
}

/**
 * EN: Map same-line hit index onto an occurrence index inside `snippet`
 *     (windows may drop earlier hits on the line).
 * JA: 同一行ヒット番号を snippet 内の出現インデックスへ写す（先頭が切れている場合あり）。
 */
export function occurrenceIndexInSnippet(
  snippet: string,
  needle: string,
  lineHitIndex: number
): number {
  const n = countNeedleOccurrences(snippet, needle)
  if (n <= 0) {
    return 0
  }
  if (lineHitIndex < 0) {
    return 0
  }
  return Math.min(lineHitIndex, n - 1)
}

/**
 * EN: All pattern hits for one search picker row — title, url, and page body lines.
 * JA: 検索結果 1 行分のヒット（タイトル・URL・本文行）を詳細一覧用に列挙する。
 * EN: Returns no rows when `pattern` is empty — detail view requires an explicit search needle.
 * JA: パターン未指定時は詳細一覧を出さない（空配列を返す）。
 */
export function listSearchEntryDetailHits(
  entry: PickerEntry,
  pattern: string
): SearchEntryDetailHit[] {
  const needle = pattern.trim()
  if (!needle) {
    return []
  }
  const matches = entry.pageMatches ?? []
  const hits: SearchEntryDetailHit[] = []
  const bodyMatchCount = matches.filter((m) => m.lineNo > 0).length
  const lineHitCounts = new Map<number, number>()

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]!
      if (bodyMatchCount > 0 && m.lineNo <= 0) {
        continue
      }
      if (m.lineNo > 0) {
        const hitOnLine = lineHitCounts.get(m.lineNo) ?? 0
        lineHitCounts.set(m.lineNo, hitOnLine + 1)
        const occurrenceInSnippet = occurrenceIndexInSnippet(m.snippet, needle, hitOnLine)
        const excerpt = excerptAroundNeedleWithHighlight(
          m.snippet,
          needle,
          SEARCH_PICKER_TEXT_CONTEXT_CHARS,
          occurrenceInSnippet
        )
        const prefix = `L${m.lineNo}: `
        const needlesInPrefix = countNeedleOccurrences(prefix, needle)
        hits.push({
          field: "text",
          displayText: `${prefix}${excerpt.text}`,
          pageMatchIndex: i,
          highlightOccurrence: needlesInPrefix + excerpt.highlightOccurrence,
          canScrollTo: entry.tabId != null
        })
        continue
      }
      const titleText = m.snippet.trim() || entry.title.trim() || entry.url
      hits.push({
        field: "title",
        displayText: titleText,
        pageMatchIndex: i,
        highlightOccurrence: 0,
        canScrollTo: entry.tabId != null
      })
    }
    return hits
  }

  const titleText = entry.title.trim() || entry.url
  if (matchesNeedle(titleText, needle)) {
    pushUniqueTitleOrUrl(hits, "title", titleText)
  }

  const url = entry.url.trim()
  if (url && matchesNeedle(url, needle)) {
    pushUniqueTitleOrUrl(hits, "url", url)
  }

  return hits
}
