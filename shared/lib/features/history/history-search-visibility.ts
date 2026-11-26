/** EN: Pure `/` search-time visibility for history tree (tabs-compatible). */

import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle.ts"
import {
  expandHistoryDay,
  expandHistoryMonth,
  isHistoryDayExpanded,
  isHistoryMonthExpanded
} from "./fold-state.ts"
import type { HistoryPickerRow } from "./picker-rows.ts"

function historyVisitMatches(
  row: HistoryPickerRow & { kind: "visit" },
  byUrl: boolean,
  lcNeedle: string
): boolean {
  if (byUrl) {
    return row.url.toLowerCase().includes(lcNeedle)
  }
  return row.title.toLowerCase().includes(lcNeedle)
}

function historyHeaderMatches(label: string, byUrl: boolean, lcNeedle: string): boolean {
  return !byUrl && label.toLowerCase().includes(lcNeedle)
}

/**
 * EN: During `/` input — virtually expand matching month/day trees; hide non-matches.
 * `fallbackVisible` is used when the needle is empty (fold-based visibility).
 */
export function computeHistorySearchFilteredVisibleIndices(
  rows: readonly HistoryPickerRow[],
  filterQuery: string,
  fallbackVisible: readonly number[]
): number[] {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)
  if (needle === "") {
    return [...fallbackVisible]
  }
  const lc = needle.toLowerCase()

  const monthLabelMatch = new Set<string>()
  const dayLabelMatch = new Set<string>()
  const visitMatch = new Set<number>()

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    if (row.kind === "month") {
      if (historyHeaderMatches(row.label, byUrl, lc)) {
        monthLabelMatch.add(row.monthKey)
      }
      continue
    }
    if (row.kind === "day") {
      if (historyHeaderMatches(row.label, byUrl, lc)) {
        dayLabelMatch.add(row.dayKey)
      }
      continue
    }
    if (historyVisitMatches(row, byUrl, lc)) {
      visitMatch.add(i)
    }
  }

  const monthShow = new Set<string>()
  const monthShowAll = new Set<string>()
  const dayShow = new Set<string>()
  const dayShowAll = new Set<string>()

  for (const monthKey of monthLabelMatch) {
    monthShow.add(monthKey)
    monthShowAll.add(monthKey)
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    if (row.kind === "day" && dayLabelMatch.has(row.dayKey)) {
      dayShow.add(row.dayKey)
      dayShowAll.add(row.dayKey)
      monthShow.add(row.monthKey)
    }
  }

  for (const tabIdx of visitMatch) {
    const row = rows[tabIdx]
    if (row === undefined || row.kind !== "visit") {
      continue
    }
    monthShow.add(row.monthKey)
    dayShow.add(row.dayKey)
  }

  const out: number[] = []
  let monthVisible = false
  let monthAll = false
  let dayVisible = false
  let dayAll = false

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    if (row.kind === "month") {
      monthVisible = monthShow.has(row.monthKey)
      monthAll = monthShowAll.has(row.monthKey)
      dayVisible = false
      dayAll = false
      if (monthVisible) {
        out.push(i)
      }
      continue
    }
    if (row.kind === "day") {
      if (!monthVisible) {
        continue
      }
      dayVisible = monthAll || dayShow.has(row.dayKey)
      dayAll = monthAll || dayShowAll.has(row.dayKey)
      if (dayVisible) {
        out.push(i)
      }
      continue
    }
    if (!monthVisible || !dayVisible) {
      continue
    }
    if (monthAll || dayAll || visitMatch.has(i)) {
      out.push(i)
    }
  }
  return out
}

/**
 * EN: After `/` Enter — permanently expand months/days that contain matches.
 * JA: `/` 確定後、マッチを含む月・日を恒久展開する。
 * @returns true when fold state changed (caller should bump foldRevision).
 */
export function expandHistoryFoldsForSearchMatches(
  rows: readonly HistoryPickerRow[],
  pattern: string
): boolean {
  const { needle } = parsePickerSearchNeedle(pattern)
  if (needle === "") {
    return false
  }
  const visible = computeHistorySearchFilteredVisibleIndices(rows, pattern, [])
  let changed = false
  for (const index of visible) {
    const row = rows[index]
    if (row === undefined) {
      continue
    }
    if (row.kind === "month" && !isHistoryMonthExpanded(row.monthKey)) {
      expandHistoryMonth(row.monthKey)
      changed = true
      continue
    }
    if (row.kind === "day" && !isHistoryDayExpanded(row.dayKey)) {
      expandHistoryDay(row.dayKey)
      changed = true
    }
  }
  return changed
}
