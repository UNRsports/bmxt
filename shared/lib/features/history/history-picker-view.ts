/** EN: Pure view / action helpers for the history tree picker. */

import {
  buildHistoryDeleteCommandLine,
  buildHistoryDeleteRangeCommandLine,
  buildHistoryOpenCommandLine
} from "../picker/build-picker-command-line.ts"
import type { TreePickerRowView } from "../side-picker/tree/tree-picker-types.ts"
import { isHistoryDayExpanded, isHistoryMonthExpanded } from "./fold-state.ts"
import type { HistoryPickerState } from "./history-picker-state.ts"
import type { HistoryPickerRow } from "./picker-rows.ts"

export type HistoryActionId = "open" | "delete" | "deleteRange"

export type HistoryRangeMs = {
  fromMs: number
  toMs: number
}

function isRowMarked(state: HistoryPickerState, row: HistoryPickerRow): boolean {
  if (row.kind === "month") {
    return state.markedMonthKeys.includes(row.monthKey)
  }
  if (row.kind === "day") {
    return state.markedDayKeys.includes(row.dayKey)
  }
  return state.markedVisitUrls.includes(row.url)
}

/** EN: Map visible rows (indices into `state.rows`) to tab-picker-style row views. */
export function buildHistoryTreeViews(
  state: HistoryPickerState,
  visibleIndices: readonly number[]
): TreePickerRowView[] {
  const views: TreePickerRowView[] = []
  for (const rowIndex of visibleIndices) {
    const row = state.rows[rowIndex]
    if (row === undefined) {
      continue
    }
    const marked = isRowMarked(state, row)
    if (row.kind === "month") {
      views.push({
        domKey: `hm-${row.monthKey}`,
        variant: "window",
        foldable: true,
        expanded: isHistoryMonthExpanded(row.monthKey),
        marked,
        label: row.label,
        detail: null,
        indent: 0
      })
      continue
    }
    if (row.kind === "day") {
      views.push({
        domKey: `hd-${row.dayKey}`,
        variant: "group",
        foldable: true,
        expanded: isHistoryDayExpanded(row.dayKey),
        marked,
        label: row.label,
        detail: null,
        indent: 0
      })
      continue
    }
    views.push({
      domKey: `hv-${row.url}`,
      variant: "tab",
      foldable: false,
      expanded: false,
      marked,
      label: row.title,
      detail: row.url,
      indent: 1
    })
  }
  return views
}

function parseKeyNumbers(key: string, expectedParts: number): number[] | null {
  const parts = key.split("-")
  if (parts.length !== expectedParts) {
    return null
  }
  const numbers: number[] = []
  for (const part of parts) {
    const n = Number(part)
    if (!Number.isInteger(n)) {
      return null
    }
    numbers.push(n)
  }
  return numbers
}

/** EN: Local-time bounds for a `YYYY-MM-DD` day key (inclusive end). */
export function historyDayBoundsMs(dayKey: string): HistoryRangeMs | null {
  const parts = parseKeyNumbers(dayKey, 3)
  if (parts === null) {
    return null
  }
  const [year, month, day] = parts as [number, number, number]
  const fromMs = new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
  const nextMs = new Date(year, month - 1, day + 1, 0, 0, 0, 0).getTime()
  if (!Number.isFinite(fromMs) || !Number.isFinite(nextMs)) {
    return null
  }
  return { fromMs, toMs: nextMs - 1 }
}

/** EN: Local-time bounds for a `YYYY-MM` month key (inclusive end). */
export function historyMonthBoundsMs(monthKey: string): HistoryRangeMs | null {
  const parts = parseKeyNumbers(monthKey, 2)
  if (parts === null) {
    return null
  }
  const [year, month] = parts as [number, number]
  const fromMs = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime()
  const nextMs = new Date(year, month, 1, 0, 0, 0, 0).getTime()
  if (!Number.isFinite(fromMs) || !Number.isFinite(nextMs)) {
    return null
  }
  return { fromMs, toMs: nextMs - 1 }
}

/** EN: Actions available for the targeted rows (open needs exactly one visit). */
export function historyActionsForTargets(
  targets: readonly HistoryPickerRow[]
): HistoryActionId[] {
  if (targets.length === 0) {
    return []
  }
  const first = targets[0]!
  if (first.kind === "visit") {
    if (targets.length === 1) {
      return ["open", "delete"]
    }
    return ["delete"]
  }
  return ["deleteRange"]
}

/** EN: Typed command line for an action, or null when targets cannot be encoded. */
export function buildHistoryActionLine(
  action: HistoryActionId,
  targets: readonly HistoryPickerRow[]
): string | null {
  if (action === "open") {
    const first = targets[0]
    if (targets.length !== 1 || first === undefined || first.kind !== "visit") {
      return null
    }
    return buildHistoryOpenCommandLine(first.url)
  }
  if (action === "delete") {
    const urls: string[] = []
    for (const row of targets) {
      if (row.kind !== "visit") {
        return null
      }
      urls.push(row.url)
    }
    return buildHistoryDeleteCommandLine(urls)
  }
  const lines: string[] = []
  for (const row of targets) {
    let bounds: HistoryRangeMs | null = null
    if (row.kind === "day") {
      bounds = historyDayBoundsMs(row.dayKey)
    } else if (row.kind === "month") {
      bounds = historyMonthBoundsMs(row.monthKey)
    }
    if (bounds === null) {
      return null
    }
    const line = buildHistoryDeleteRangeCommandLine(
      new Date(bounds.fromMs).toISOString(),
      new Date(bounds.toMs).toISOString()
    )
    if (line === null) {
      return null
    }
    lines.push(line)
  }
  if (lines.length === 0) {
    return null
  }
  return lines.join(" && ")
}

export type HistoryRemovedSet = {
  urls: readonly string[]
  dayKeys: readonly string[]
  monthKeys: readonly string[]
}

/**
 * EN: Drop deleted visits / days / months from the row list, then prune empty headers.
 * JA: 削除した訪問・日・月を行リストから除き、空になった見出しも除く。
 */
export function removeHistoryRows(
  rows: readonly HistoryPickerRow[],
  removed: HistoryRemovedSet
): HistoryPickerRow[] {
  const urlSet = new Set<string>(removed.urls)
  const daySet = new Set<string>(removed.dayKeys)
  const monthSet = new Set<string>(removed.monthKeys)

  const kept: HistoryPickerRow[] = []
  for (const row of rows) {
    if (row.kind === "month") {
      if (monthSet.has(row.monthKey)) {
        continue
      }
      kept.push(row)
      continue
    }
    if (row.kind === "day") {
      if (daySet.has(row.dayKey) || monthSet.has(row.monthKey)) {
        continue
      }
      kept.push(row)
      continue
    }
    if (urlSet.has(row.url) || daySet.has(row.dayKey) || monthSet.has(row.monthKey)) {
      continue
    }
    kept.push(row)
  }

  // EN: Prune day headers without visits, then month headers without days.
  const pruned: HistoryPickerRow[] = []
  for (let i = 0; i < kept.length; i += 1) {
    const row = kept[i]!
    if (row.kind === "visit") {
      pruned.push(row)
      continue
    }
    const next = kept[i + 1]
    if (row.kind === "day") {
      if (next !== undefined && next.kind === "visit") {
        pruned.push(row)
      }
      continue
    }
    pruned.push(row)
  }
  const final: HistoryPickerRow[] = []
  for (let i = 0; i < pruned.length; i += 1) {
    const row = pruned[i]!
    if (row.kind !== "month") {
      final.push(row)
      continue
    }
    const next = pruned[i + 1]
    if (next !== undefined && next.kind === "day") {
      final.push(row)
    }
  }
  return final
}

export function historyTargetLabel(row: HistoryPickerRow): string {
  if (row.kind === "visit") {
    return row.title
  }
  return row.label
}
