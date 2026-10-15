import type { SearchPageMatch } from "../side-picker/model/picker-entry.ts"

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
  return match
}

/** EN: Encode pageMatches for ListResult `fields` (string scalar). */
export function serializeSearchPageMatchesField(
  matches: readonly SearchPageMatch[] | undefined
): string | null {
  if (!matches || matches.length === 0) {
    return null
  }
  const payload = matches.map((m) => {
    const row: Record<string, number | string> = {
      lineNo: m.lineNo,
      snippet: m.snippet,
      occurrence: m.occurrence
    }
    if (m.globalOccurrence !== undefined && Number.isFinite(m.globalOccurrence)) {
      row.globalOccurrence = m.globalOccurrence
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
