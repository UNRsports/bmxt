import type { SearchPageMatch } from "../side-picker/model/picker-entry"
import { globalNeedleOccurrenceForLine, innerTextLinesFromBodyText } from "../page-dom/needle-occurrence"
import { matchesNeedle } from "./matcher"
import { excerptAroundNeedle } from "./search-picker-excerpt"

const DEFAULT_MAX_HITS = 32
const BODY_SNIPPET_CONTEXT = 96

function pushLineMatch(
  matches: SearchPageMatch[],
  occurrence: Map<string, number>,
  lineNo: number,
  rawLine: string,
  bodyLines: readonly string[],
  needle: string
): void {
  const trimmed = rawLine.trim().slice(0, 500)
  if (!trimmed) {
    return
  }
  const suffix = rawLine.length > 500 ? "…" : ""
  const snippet = `${trimmed}${suffix}`
  const key = snippet.toLowerCase()
  const occ = occurrence.get(key) ?? 0
  occurrence.set(key, occ + 1)
  const globalOccurrence =
    lineNo > 0 ? globalNeedleOccurrenceForLine(bodyLines, lineNo, needle) : 0
  matches.push({
    lineNo,
    snippet,
    occurrence: occ,
    globalOccurrence: globalOccurrence >= 0 ? globalOccurrence : undefined
  })
}

/**
 * EN: Collect tab-title and body line hits for one open tab.
 * JA: 1 タブ分のタイトル／本文ヒットを集める。
 */
export function collectPageMatchesForTab(
  title: string,
  text: string | null,
  pattern: string,
  maxHits = DEFAULT_MAX_HITS
): SearchPageMatch[] {
  const needle = pattern.trim()
  if (!needle) {
    return []
  }

  const matches: SearchPageMatch[] = []
  const occurrence = new Map<string, number>()

  const bodyLines = text !== null ? innerTextLinesFromBodyText(text) : []

  if (title.trim().length > 0 && matchesNeedle(title, needle)) {
    pushLineMatch(matches, occurrence, 0, title, bodyLines, needle)
  }

  if (text !== null && matchesNeedle(text, needle)) {
    let lineNo = 0
    for (const line of bodyLines) {
      lineNo += 1
      if (!matchesNeedle(line, needle)) {
        continue
      }
      pushLineMatch(matches, occurrence, lineNo, line, bodyLines, needle)
      if (matches.length >= maxHits) {
        return matches
      }
    }

    const bodyLineCount = matches.filter((m) => m.lineNo > 0).length
    if (bodyLineCount === 0) {
      const snippet = excerptAroundNeedle(text, needle, BODY_SNIPPET_CONTEXT)
      if (snippet.trim().length > 0) {
        pushLineMatch(matches, occurrence, 1, snippet, bodyLines, needle)
      }
    }
  }

  return matches
}
