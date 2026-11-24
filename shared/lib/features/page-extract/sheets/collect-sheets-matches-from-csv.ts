/**
 * EN: Scan Sheets CSV cells for a needle; produce SearchPageMatch rows with A1 cellRef.
 * JA: Sheets CSV のセルを needle 走査し、A1 cellRef 付き SearchPageMatch を返す。
 */

import type { SearchPageMatch } from "../../side-picker/model/picker-entry.ts"
import { matchesNeedle } from "../../search/matcher.ts"
import { excerptAroundNeedle } from "../../search/search-picker-excerpt.ts"
import { cellRefFromIndices } from "./sheets-a1.ts"
import { parseSheetsCsv } from "./parse-sheets-csv.ts"

const SNIPPET_MAX = 500

export type SheetsCsvMatchResult = {
  matches: SearchPageMatch[]
  bodyLength: number
  truncated: boolean
}

/**
 * EN: Walk cells in row-major order. `maxTextChars` bounds how many cell characters are scanned
 *     (0 / already-clamped large = no soft truncate beyond absolute CSV length).
 * JA: 行優先でセル走査。`maxTextChars` は走査するセル文字数の上限。
 */
export function collectSheetsMatchesFromCsv(
  csvText: string,
  needleRaw: string,
  maxMatches: number,
  maxTextChars: number
): SheetsCsvMatchResult {
  const needle = needleRaw.trim()
  if (!needle || maxMatches <= 0) {
    return { matches: [], bodyLength: 0, truncated: false }
  }
  const matchCap = Math.min(Math.floor(maxMatches), 500)
  const textCap =
    Number.isFinite(maxTextChars) && maxTextChars > 0 ? Math.floor(maxTextChars) : Number.POSITIVE_INFINITY

  const rows = parseSheetsCsv(csvText)
  const matches: SearchPageMatch[] = []
  const occurrence = new Map<string, number>()
  let bodyLength = 0
  let truncated = false
  let globalOccurrence = 0

  for (let r = 0; r < rows.length; r += 1) {
    const cols = rows[r]!
    for (let c = 0; c < cols.length; c += 1) {
      const value = cols[c] ?? ""
      if (!value) {
        continue
      }
      if (bodyLength >= textCap) {
        truncated = true
        return { matches, bodyLength, truncated }
      }
      const remaining = textCap - bodyLength
      const scanned =
        value.length > remaining ? value.slice(0, Math.max(0, remaining)) : value
      bodyLength += scanned.length
      if (scanned.length < value.length) {
        truncated = true
      }
      if (!matchesNeedle(scanned, needle)) {
        if (truncated) {
          return { matches, bodyLength, truncated }
        }
        continue
      }
      if (matches.length >= matchCap) {
        truncated = true
        return { matches, bodyLength, truncated }
      }
      const cellRef = cellRefFromIndices(c, r + 1)
      const excerpt = excerptAroundNeedle(scanned, needle)
      const valuePart = excerpt.trim().slice(0, SNIPPET_MAX - cellRef.length - 2)
      const snippet = `${cellRef}: ${valuePart}`.slice(0, SNIPPET_MAX)
      const key = snippet.toLowerCase()
      const occ = occurrence.get(key) ?? 0
      occurrence.set(key, occ + 1)
      matches.push({
        lineNo: r + 1,
        snippet,
        occurrence: occ,
        globalOccurrence,
        cellRef
      })
      globalOccurrence += 1
      if (truncated) {
        return { matches, bodyLength, truncated }
      }
    }
  }

  return { matches, bodyLength, truncated }
}

/**
 * EN: Flatten non-empty cells to preview lines (`A1: value`) for empty-pattern page scan.
 * JA: 空パターン用に非空セルを `A1: value` 行へ平坦化。
 */
export function sheetsCsvPreviewLines(csvText: string, maxLines: number, maxTextChars: number): {
  lines: string[]
  bodyLength: number
  truncated: boolean
} {
  const lineCap = Math.max(0, Math.floor(maxLines))
  const textCap =
    Number.isFinite(maxTextChars) && maxTextChars > 0 ? Math.floor(maxTextChars) : Number.POSITIVE_INFINITY
  const rows = parseSheetsCsv(csvText)
  const lines: string[] = []
  let bodyLength = 0
  let truncated = false

  for (let r = 0; r < rows.length; r += 1) {
    const cols = rows[r]!
    for (let c = 0; c < cols.length; c += 1) {
      const value = (cols[c] ?? "").trim()
      if (!value) {
        continue
      }
      if (bodyLength >= textCap || lines.length >= lineCap) {
        truncated = true
        return { lines, bodyLength, truncated }
      }
      const cellRef = cellRefFromIndices(c, r + 1)
      const line = `${cellRef}: ${value}`.slice(0, SNIPPET_MAX)
      bodyLength += value.length
      lines.push(line)
    }
  }
  return { lines, bodyLength, truncated }
}
