import { parsePickerSearchNeedle, splitTextHighlightSegments } from "./picker-search-needle"

/** Plain list row matches the same needle rules as the tab picker (`@` → URL spans). */
export function plainPickerLineMatches(line: string, filterQuery: string): boolean {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)
  if (needle === "") {
    return true
  }
  const lc = needle.toLowerCase()
  if (byUrl) {
    const re = /https?:\/\/\S+/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(line)) !== null) {
      if (m[0].toLowerCase().includes(lc)) {
        return true
      }
    }
    return false
  }
  return line.toLowerCase().includes(lc)
}

/** Indices into `lines` matching `searchHighlightQuery` (empty needle → none). */
export function plainPickerHiIndicesMatching(
  lines: string[],
  searchHighlightQuery: string
): number[] {
  const { needle } = parsePickerSearchNeedle(searchHighlightQuery)
  if (needle === "") {
    return []
  }
  const out: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (plainPickerLineMatches(lines[i]!, searchHighlightQuery)) {
      out.push(i)
    }
  }
  return out
}

export type PlainPickerHighlightSegment = { text: string; match: boolean }

/** Segments for one plain row (`@` highlights URL spans only). */
export function plainPickerLineHighlightSegments(
  line: string,
  searchHighlightQuery: string
): PlainPickerHighlightSegment[] {
  const { byUrl, needle } = parsePickerSearchNeedle(searchHighlightQuery)
  if (needle === "") {
    return [{ text: line, match: false }]
  }
  if (!byUrl) {
    return splitTextHighlightSegments(line, needle)
  }
  const re = /https?:\/\/\S+/gi
  const out: PlainPickerHighlightSegment[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      out.push({ text: line.slice(last, m.index), match: false })
    }
    const url = m[0]
    out.push(...splitTextHighlightSegments(url, needle))
    last = m.index + url.length
  }
  if (last < line.length) {
    out.push({ text: line.slice(last), match: false })
  }
  if (out.length === 0) {
    return [{ text: line, match: false }]
  }
  return out
}
