import type { SearchPageMatch } from "../side-picker/model/picker-entry"
import { findRawNeedleInHaystack, innerTextLinesFromBodyText } from "../page-dom/needle-occurrence"
import { matchesNeedle } from "./matcher"
import { excerptAroundNeedle } from "./search-picker-excerpt"

const BODY_SNIPPET_CONTEXT = 96
const LINE_HIT_SNIPPET_CONTEXT = 48

function snippetForLineNeedleHit(line: string, needle: string, from: number): string {
  const hit = findRawNeedleInHaystack(line, needle, from)
  if (!hit) {
    const trimmed = line.trim().slice(0, 500)
    return trimmed + (line.length > 500 ? "…" : "")
  }
  const start = Math.max(0, hit.index - LINE_HIT_SNIPPET_CONTEXT)
  const end = Math.min(line.length, hit.index + hit.length + LINE_HIT_SNIPPET_CONTEXT)
  let excerpt = line.slice(start, end).trim()
  if (start > 0) {
    excerpt = `…${excerpt}`
  }
  if (end < line.length) {
    excerpt = `${excerpt}…`
  }
  return excerpt.slice(0, 500)
}

function pushLineMatch(
  matches: SearchPageMatch[],
  occurrence: Map<string, number>,
  lineNo: number,
  snippet: string,
  globalOccurrence: number
): void {
  const trimmed = snippet.trim()
  if (!trimmed) {
    return
  }
  const key = trimmed.toLowerCase()
  const occ = occurrence.get(key) ?? 0
  occurrence.set(key, occ + 1)
  matches.push({
    lineNo,
    snippet: trimmed,
    occurrence: occ,
    globalOccurrence
  })
}

/**
 * EN: Collect tab-title and body line hits for one open tab.
 * JA: 1 タブ分のタイトル／本文ヒットを集める。
 */
export function collectPageMatchesForTab(
  title: string,
  text: string | null,
  pattern: string
): SearchPageMatch[] {
  const needle = pattern.trim()
  if (!needle) {
    return []
  }

  const matches: SearchPageMatch[] = []
  const occurrence = new Map<string, number>()
  let nextGlobalOccurrence = 0

  const bodyLines = text !== null ? innerTextLinesFromBodyText(text) : []

  if (title.trim().length > 0 && matchesNeedle(title, needle)) {
    pushLineMatch(matches, occurrence, 0, title, nextGlobalOccurrence)
    nextGlobalOccurrence += 1
  }

  if (text !== null && matchesNeedle(text, needle)) {
    let lineNo = 0
    for (const line of bodyLines) {
      lineNo += 1
      if (!matchesNeedle(line, needle)) {
        continue
      }
      let from = 0
      let hitOnLine = 0
      while (from < line.length) {
        const hit = findRawNeedleInHaystack(line, needle, from)
        if (!hit) {
          break
        }
        const snippet =
          hitOnLine === 0 && !line.includes("\n")
            ? `${line.trim().slice(0, 500)}${line.length > 500 ? "…" : ""}`
            : snippetForLineNeedleHit(line, needle, from)
        pushLineMatch(matches, occurrence, lineNo, snippet, nextGlobalOccurrence)
        nextGlobalOccurrence += 1
        hitOnLine += 1
        from = hit.index + Math.max(1, hit.length)
      }
    }

    const bodyLineCount = matches.filter((m) => m.lineNo > 0).length
    if (bodyLineCount === 0) {
      const snippet = excerptAroundNeedle(text, needle, BODY_SNIPPET_CONTEXT)
      if (snippet.trim().length > 0) {
        pushLineMatch(matches, occurrence, 1, snippet, nextGlobalOccurrence)
      }
    }
  }

  return matches
}
