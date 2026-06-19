/** EN: Characters shown before/after the needle in the `text:` row. */
export const SEARCH_PICKER_TEXT_CONTEXT_CHARS = 48

export type SearchPickerExcerpt = {
  text: string
  /** EN: 0-based needle occurrence index inside `text` to highlight exclusively. */
  highlightOccurrence: number
}

function needleOccurrenceIndex(
  haystack: string,
  needle: string,
  occurrence: number
): number {
  const lower = haystack.toLowerCase()
  const nLower = needle.toLowerCase()
  let searchFrom = 0
  for (let o = 0; o <= occurrence; o++) {
    const idx = lower.indexOf(nLower, searchFrom)
    if (idx < 0) {
      return -1
    }
    if (o === occurrence) {
      return idx
    }
    searchFrom = idx + needle.length
  }
  return -1
}

function countNeedleOccurrencesBefore(
  haystack: string,
  needle: string,
  beforeIndex: number
): number {
  const lower = haystack.toLowerCase()
  const nLower = needle.toLowerCase()
  let searchFrom = 0
  let count = 0
  while (searchFrom < beforeIndex) {
    const idx = lower.indexOf(nLower, searchFrom)
    if (idx < 0 || idx >= beforeIndex) {
      break
    }
    count += 1
    searchFrom = idx + needle.length
  }
  return count
}

/**
 * EN: Clip page snippet to a window around the case-insensitive needle hit.
 * JA: ページ内スニペットを検索語の前後数十文字に切り出す。
 */
export function excerptAroundNeedle(
  text: string,
  needle: string,
  context = SEARCH_PICKER_TEXT_CONTEXT_CHARS,
  occurrence = 0
): string {
  return excerptAroundNeedleWithHighlight(text, needle, context, occurrence).text
}

/**
 * EN: Like `excerptAroundNeedle`, plus which occurrence inside the excerpt is the active hit.
 * JA: 切り出しテキストと、その中で強調すべき needle 出現インデックスを返す。
 */
export function excerptAroundNeedleWithHighlight(
  text: string,
  needle: string,
  context = SEARCH_PICKER_TEXT_CONTEXT_CHARS,
  occurrence = 0
): SearchPickerExcerpt {
  const trimmed = text.trim()
  if (!trimmed) {
    return { text: "", highlightOccurrence: 0 }
  }
  const n = needle.trim()
  if (!n) {
    if (trimmed.length <= context * 2 + 8) {
      return { text: trimmed, highlightOccurrence: 0 }
    }
    return { text: `${trimmed.slice(0, context * 2)}…`, highlightOccurrence: 0 }
  }
  const idx = needleOccurrenceIndex(trimmed, n, occurrence)
  if (idx < 0) {
    if (trimmed.length <= context * 2 + 8) {
      return { text: trimmed, highlightOccurrence: 0 }
    }
    return { text: `${trimmed.slice(0, context * 2)}…`, highlightOccurrence: 0 }
  }
  const start = Math.max(0, idx - context)
  const end = Math.min(trimmed.length, idx + n.length + context)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < trimmed.length ? "…" : ""
  const excerpt = `${prefix}${trimmed.slice(start, end)}${suffix}`
  const offsetInExcerpt = prefix.length + (idx - start)
  const highlightOccurrence = countNeedleOccurrencesBefore(excerpt, n, offsetInExcerpt)
  return { text: excerpt, highlightOccurrence }
}
