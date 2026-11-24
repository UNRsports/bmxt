/** EN: Month/day fold for history picker (tab window/group style). */

import type { HistoryPickerRow } from "./picker-rows.ts"

const collapsedMonthKeys = new Set<string>()
const collapsedDayKeys = new Set<string>()

export function isHistoryMonthExpanded(monthKey: string): boolean {
  return !collapsedMonthKeys.has(monthKey)
}

export function isHistoryDayExpanded(dayKey: string): boolean {
  return !collapsedDayKeys.has(dayKey)
}

export function toggleHistoryMonthFold(monthKey: string): boolean {
  if (collapsedMonthKeys.has(monthKey)) {
    collapsedMonthKeys.delete(monthKey)
    return true
  }
  collapsedMonthKeys.add(monthKey)
  return false
}

export function toggleHistoryDayFold(dayKey: string): boolean {
  if (collapsedDayKeys.has(dayKey)) {
    collapsedDayKeys.delete(dayKey)
    return true
  }
  collapsedDayKeys.add(dayKey)
  return false
}

export function expandHistoryMonth(monthKey: string): void {
  collapsedMonthKeys.delete(monthKey)
}

export function expandHistoryDay(dayKey: string): void {
  collapsedDayKeys.delete(dayKey)
}

export function collapseHistoryMonth(monthKey: string): void {
  collapsedMonthKeys.add(monthKey)
}

export function collapseHistoryDay(dayKey: string): void {
  collapsedDayKeys.add(dayKey)
}

export function resetHistoryFoldState(): void {
  collapsedMonthKeys.clear()
  collapsedDayKeys.clear()
}

export function computeHistoryVisibleRowIndices(rows: readonly HistoryPickerRow[]): number[] {
  const visible: number[] = []
  let monthExpanded = true
  let dayExpanded = true

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    if (row.kind === "month") {
      monthExpanded = !collapsedMonthKeys.has(row.monthKey)
      visible.push(i)
      dayExpanded = true
      continue
    }
    if (row.kind === "day") {
      if (!monthExpanded) {
        continue
      }
      dayExpanded = !collapsedDayKeys.has(row.dayKey)
      visible.push(i)
      continue
    }
    if (monthExpanded && dayExpanded) {
      visible.push(i)
    }
  }
  return visible
}
