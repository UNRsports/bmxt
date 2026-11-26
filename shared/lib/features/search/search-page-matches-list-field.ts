import type { SearchPageMatch } from "../side-picker/model/picker-entry.ts"
import { MAX_SERIALIZED_PAGE_MATCHES } from "./limits.ts"

/** EN: ListResult field key for serialized `pageMatches` (JSON string; scalar fields only). */
export const SEARCH_HIT_PAGE_MATCHES_FIELD = "pageMatchesJson"

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function parseOnePageMatch(raw: unknown): SearchPageMatch | null {
  if (raw === null || typeof raw !== "object") {
    return null
  }
  const o = raw as Record<string, unknown>
  if (!isFiniteNumber(o.lineNo) || typeof o.snippet !== "string") {
    return null
  }
  const snippet = o.snippet.trim()
  if (snippet.length === 0) {
    return null
  }
  const occurrence = isFiniteNumber(o.occurrence) ? Math.max(0, Math.floor(o.occurrence)) : 0
  const match: SearchPageMatch = {
    lineNo: Math.floor(o.lineNo),
    snippet,
    occurrence
  }
  if (isFiniteNumber(o.globalOccurrence) && o.globalOccurrence >= 0) {
    match.globalOccurrence = Math.floor(o.globalOccurrence)
  }
  if (typeof o.cellRef === "string") {
    const cellRef = o.cellRef.trim().toUpperCase()
    if (/^[A-Z]{1,3}\d{1,7}$/.test(cellRef)) {
      match.cellRef = cellRef
    }
  }
  if (typeof o.cellValue === "string" && o.cellValue.trim()) {
    match.cellValue = o.cellValue.trim().slice(0, 500)
  }
  if (o.sheetsRowTrusted === true || o.sheetsRowTrusted === 1) {
    match.sheetsRowTrusted = true
  } else if (o.sheetsRowTrusted === false || o.sheetsRowTrusted === 0) {
    match.sheetsRowTrusted = false
  }
  return match
}

/** EN: Encode pageMatches for ListResult `fields` (string scalar). */
export function serializeSearchPageMatchesField(
  matches: readonly SearchPageMatch[] | undefined
): string | null {
  if (!matches || matches.length === 0) {
    return null
  }
  const limited =
    matches.length > MAX_SERIALIZED_PAGE_MATCHES
      ? matches.slice(0, MAX_SERIALIZED_PAGE_MATCHES)
      : matches
  const payload = limited.map((m) => {
    const row: Record<string, number | string> = {
      lineNo: m.lineNo,
      snippet: m.snippet,
      occurrence: m.occurrence
    }
    if (
      m.globalOccurrence !== undefined &&
      Number.isFinite(m.globalOccurrence) &&
      m.globalOccurrence >= 0
    ) {
      row.globalOccurrence = m.globalOccurrence
    }
    if (typeof m.cellRef === "string") {
      const cellRef = m.cellRef.trim().toUpperCase()
      if (/^[A-Z]{1,3}\d{1,7}$/.test(cellRef)) {
        row.cellRef = cellRef
      }
    }
    if (typeof m.cellValue === "string" && m.cellValue.trim()) {
      row.cellValue = m.cellValue.trim().slice(0, 500)
    }
    if (m.sheetsRowTrusted === true) {
      row.sheetsRowTrusted = 1
    } else if (m.sheetsRowTrusted === false) {
      row.sheetsRowTrusted = 0
    }
    return row
  })
  return JSON.stringify(payload)
}

/** EN: Decode ListResult `pageMatchesJson` back to SearchPageMatch[]. */
export function parseSearchPageMatchesField(raw: unknown): SearchPageMatch[] | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed)) {
    return undefined
  }
  const out: SearchPageMatch[] = []
  for (const item of parsed) {
    const match = parseOnePageMatch(item)
    if (match) {
      out.push(match)
    }
  }
  return out.length > 0 ? out : undefined
}
