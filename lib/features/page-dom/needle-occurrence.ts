/**
 * EN: Shared innerText-line helpers for mapping a body line hit to a global needle index.
 * JA: 本文行ヒットをページ内 needle 出現番号へ対応づける共有ヘルパー。
 */

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
  const needleLower = trimmedNeedle.toLowerCase()
  let globalIndex = 0
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!
    let from = 0
    while (from < line.length) {
      const idx = line.toLowerCase().indexOf(needleLower, from)
      if (idx < 0) {
        break
      }
      if (lineIdx + 1 === lineNo) {
        return globalIndex
      }
      globalIndex += 1
      from = idx + Math.max(1, trimmedNeedle.length)
    }
  }
  return -1
}
