import type { SearchPageMatch } from "../side-picker/model/picker-entry"

/** EN: Prefer body line hits (`lineNo > 0`) over tab-title hits (`lineNo === 0`). */
export function pageMatchesForDisplay(matches: SearchPageMatch[] | undefined): SearchPageMatch[] {
  if (!matches || matches.length === 0) {
    return []
  }
  const bodyMatches = matches.filter((m) => m.lineNo > 0)
  return bodyMatches.length > 0 ? bodyMatches : matches
}

export function pickPageMatchForDisplay(
  matches: SearchPageMatch[] | undefined,
  matchHi: number
): SearchPageMatch | undefined {
  const pool = pageMatchesForDisplay(matches)
  if (pool.length === 0) {
    return undefined
  }
  const idx = ((matchHi % pool.length) + pool.length) % pool.length
  return pool[idx]
}
