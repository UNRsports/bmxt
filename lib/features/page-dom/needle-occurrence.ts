/**
 * EN: Shared innerText-line helpers for mapping a body line hit to a global needle index.
 * JA: 本文行ヒットをページ内 needle 出現番号へ対応づける共有ヘルパー。
 */

import type { SearchPageMatch } from "../side-picker/model/picker-entry"

export type RawNeedleHit = {
  index: number
  length: number
}

function stripInvisibleFormatChars(s: string): string {
  return s.replace(/[\uFEFF\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, "")
}

/** EN: Keep in sync with `lib/features/search/matcher.ts`. */
function normalizeForMatch(s: string): string {
  const t = stripInvisibleFormatChars(s)
  try {
    return t.normalize("NFKC").toLowerCase()
  } catch {
    return t.toLowerCase()
  }
}

/**
 * EN: Start offset and length in `haystack` for the next `needle` match at/after `from`.
 * JA: `from` 以降で `needle` に一致する生文字列の開始位置と長さ。
 */
export function findRawNeedleInHaystack(
  haystack: string,
  needle: string,
  from = 0
): RawNeedleHit | null {
  const trimmed = needle.trim()
  if (!trimmed || from >= haystack.length) {
    return null
  }

  const lowerNeedle = trimmed.toLowerCase()
  const direct = haystack.toLowerCase().indexOf(lowerNeedle, from)
  if (direct >= 0) {
    return { index: direct, length: trimmed.length }
  }

  const normNeedle = normalizeForMatch(trimmed)
  if (!normNeedle) {
    return null
  }

  for (let i = from; i < haystack.length; i++) {
    let normAccum = ""
    for (let j = i; j < haystack.length; j++) {
      normAccum = normalizeForMatch(haystack.slice(i, j + 1))
      if (normAccum === normNeedle) {
        return { index: i, length: j + 1 - i }
      }
      if (normAccum.length > normNeedle.length) {
        break
      }
      if (!normNeedle.startsWith(normAccum)) {
        break
      }
    }
  }
  return null
}

/** EN: Split `document.body.innerText` the same way search indexing does. */
export function innerTextLinesFromBodyText(text: string): string[] {
  return text.split(/\r?\n/)
}

/**
 * EN: Global 0-based index of the first needle on `lineNo` (1-based) within `lines`.
 * JA: `lines` 上で `lineNo` 行目の最初の needle の全体出現番号（0 始まり）。
 */
export function globalNeedleOccurrenceForLine(
  lines: readonly string[],
  lineNo: number,
  needle: string
): number {
  const trimmedNeedle = needle.trim()
  if (!trimmedNeedle || lineNo <= 0) {
    return -1
  }
  let globalIndex = 0
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!
    let from = 0
    while (from < line.length) {
      const hit = findRawNeedleInHaystack(line, trimmedNeedle, from)
      if (!hit) {
        break
      }
      if (lineIdx + 1 === lineNo) {
        return globalIndex
      }
      globalIndex += 1
      from = hit.index + Math.max(1, hit.length)
    }
  }
  return -1
}

/** EN: Attach `globalOccurrence` to body-line matches from indexed innerText lines. */
export function assignGlobalOccurrencesToPageMatches(
  matches: readonly SearchPageMatch[],
  bodyLines: readonly string[],
  needle: string
): SearchPageMatch[] {
  const trimmedNeedle = needle.trim()
  if (!trimmedNeedle) {
    return [...matches]
  }
  return matches.map((match) => {
    if (match.lineNo <= 0) {
      return match
    }
    const globalOccurrence = globalNeedleOccurrenceForLine(bodyLines, match.lineNo, trimmedNeedle)
    if (globalOccurrence < 0) {
      return match
    }
    return { ...match, globalOccurrence }
  })
}
