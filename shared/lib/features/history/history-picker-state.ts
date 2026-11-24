/** EN: History tree picker session state (rows + highlight + marks + action menu). */

import type { HistoryPickerRow } from "./picker-rows.ts"

export type HistoryMarkedKind = "month" | "day" | "visit"

export type HistoryPickerState = {
  rows: HistoryPickerRow[]
  /** EN: Index into the visible-row list (not into `rows`). */
  hi: number
  markedMonthKeys: string[]
  markedDayKeys: string[]
  markedVisitUrls: string[]
  /** EN: Homogeneous mark kind; null when nothing is marked. */
  markedKind: HistoryMarkedKind | null
  actionMenuOpen: boolean
  actionMenuIndex: number
  filterQuery: string
}

export function createHistoryPickerState(rows: HistoryPickerRow[]): HistoryPickerState {
  return {
    rows,
    hi: 0,
    markedMonthKeys: [],
    markedDayKeys: [],
    markedVisitUrls: [],
    markedKind: null,
    actionMenuOpen: false,
    actionMenuIndex: 0,
    filterQuery: ""
  }
}

export function clearHistoryPickerMarks(prev: HistoryPickerState): HistoryPickerState {
  return {
    ...prev,
    markedMonthKeys: [],
    markedDayKeys: [],
    markedVisitUrls: [],
    markedKind: null
  }
}

function toggleInList(list: readonly string[], value: string): string[] {
  if (list.includes(value)) {
    return list.filter((entry) => entry !== value)
  }
  return [...list, value]
}

/**
 * EN: Toggle mark on a row. A different kind than the current marks is rejected (returns prev).
 * JA: 行のマークを切り替える。現在のマークと異なる種別は拒否する（prev を返す）。
 */
export function toggleHistoryRowMark(
  prev: HistoryPickerState,
  row: HistoryPickerRow
): HistoryPickerState {
  if (prev.markedKind !== null && prev.markedKind !== row.kind) {
    return prev
  }
  if (row.kind === "month") {
    const nextKeys = toggleInList(prev.markedMonthKeys, row.monthKey)
    return {
      ...prev,
      markedMonthKeys: nextKeys,
      markedKind: nextKeys.length === 0 ? null : "month"
    }
  }
  if (row.kind === "day") {
    const nextKeys = toggleInList(prev.markedDayKeys, row.dayKey)
    return {
      ...prev,
      markedDayKeys: nextKeys,
      markedKind: nextKeys.length === 0 ? null : "day"
    }
  }
  const nextUrls = toggleInList(prev.markedVisitUrls, row.url)
  return {
    ...prev,
    markedVisitUrls: nextUrls,
    markedKind: nextUrls.length === 0 ? null : "visit"
  }
}

/** EN: Rows targeted by an action: marked rows when any, otherwise the highlighted row. */
export function historyActionTargetRows(
  state: HistoryPickerState,
  highlighted: HistoryPickerRow | null
): HistoryPickerRow[] {
  if (state.markedKind === "month") {
    return state.rows.filter(
      (row) => row.kind === "month" && state.markedMonthKeys.includes(row.monthKey)
    )
  }
  if (state.markedKind === "day") {
    return state.rows.filter(
      (row) => row.kind === "day" && state.markedDayKeys.includes(row.dayKey)
    )
  }
  if (state.markedKind === "visit") {
    return state.rows.filter(
      (row) => row.kind === "visit" && state.markedVisitUrls.includes(row.url)
    )
  }
  if (highlighted === null) {
    return []
  }
  return [highlighted]
}
