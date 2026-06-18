import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"

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

/** EN: 0-based needle hit index on `match.lineNo` within `pageMatches`. */
export function lineHitIndexForPageMatch(
  matches: SearchPageMatch[] | undefined,
  pageMatchIndex: number
): number {
  const match = matches?.[pageMatchIndex]
  if (!match || match.lineNo <= 0 || !matches) {
    return -1
  }
  let hitOnLine = 0
  for (let i = 0; i <= pageMatchIndex; i++) {
    const row = matches[i]
    if (!row || row.lineNo !== match.lineNo) {
      continue
    }
    if (i === pageMatchIndex) {
      return hitOnLine
    }
    hitOnLine += 1
  }
  return -1
}

/** EN: Map display `matchHi` to a raw `pageMatches` index. */
export function resolveSearchResultsPageMatchIndex(
  matches: SearchPageMatch[] | undefined,
  matchHi: number
): number {
  return resolveSearchPickerPageMatchFromMatches(matches, matchHi).pageMatchIndex
}

export type ResolvedSearchPickerPageMatch = {
  match: SearchPageMatch | undefined
  /** EN: Index into `entry.pageMatches` (raw array). */
  pageMatchIndex: number
}

/** EN: Resolve the active page hit from display `matchHi` (n/N pool). */
export function resolveSearchPickerPageMatchFromMatches(
  matches: SearchPageMatch[] | undefined,
  matchHi: number
): ResolvedSearchPickerPageMatch {
  const raw = matches ?? []
  if (raw.length === 0) {
    return { match: undefined, pageMatchIndex: 0 }
  }
  const picked = pickPageMatchForDisplay(raw, matchHi)
  if (!picked) {
    return { match: raw[0], pageMatchIndex: 0 }
  }
  const pageMatchIndex = raw.indexOf(picked)
  return {
    match: picked,
    pageMatchIndex: pageMatchIndex >= 0 ? pageMatchIndex : 0
  }
}

/** EN: Resolve the active page hit for one picker row. */
export function resolveSearchPickerPageMatch(
  entry: PickerEntry,
  matchHi: number
): ResolvedSearchPickerPageMatch {
  return resolveSearchPickerPageMatchFromMatches(entry.pageMatches, matchHi)
}

/** EN: Headline suffix for the active page hit (uses display pool / n/N index). */
export function searchPickerActiveMatchDetail(entry: PickerEntry, matchHi = 0): string {
  const m = pickPageMatchForDisplay(entry.pageMatches, matchHi) ?? entry.pageMatches?.[0]
  if (!m) {
    return ""
  }
  const lineTag = m.lineNo > 0 ? `L${m.lineNo}: ` : ""
  return `${lineTag}${m.snippet}`
}
