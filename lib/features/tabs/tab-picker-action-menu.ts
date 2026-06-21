import { groupRowKey } from "./tab-picker-keyboard"
import { actionMenuItemsForKind } from "./tab-picker-overlay-constants"
import type { ActionMenuPanel, SelectKind } from "./tab-picker-overlay-types"
import type { TabPickerRow } from "./picker-rows"

function tabTitleById(rows: TabPickerRow[], tabId: number): string {
  for (const row of rows) {
    if (row.kind === "tab" && row.tabId === tabId) {
      return row.title
    }
  }
  return `#${tabId}`
}

function tabIdsForMarked(
  rows: TabPickerRow[],
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[]
): number[] {
  if (markedKind === "tab") {
    return [...markedTabIds].sort((a, b) => a - b)
  }
  if (markedKind === "window") {
    const windowSet = new Set(markedWindowIds)
    const out: number[] = []
    for (const row of rows) {
      if (row.kind === "tab" && windowSet.has(row.windowId)) {
        out.push(row.tabId)
      }
    }
    return out.sort((a, b) => a - b)
  }
  if (markedKind === "group") {
    const groupSet = new Set(markedGroupKeys)
    const out: number[] = []
    for (const row of rows) {
      if (row.kind !== "tab") {
        continue
      }
      const key = groupRowKey(row.windowId, row.groupId)
      if (groupSet.has(key)) {
        out.push(row.tabId)
      }
    }
    return out.sort((a, b) => a - b)
  }
  return []
}

function tabIdsForRow(rows: TabPickerRow[], row: TabPickerRow): number[] {
  if (row.kind === "tab") {
    return [row.tabId]
  }
  if (row.kind === "window") {
    const out: number[] = []
    for (const r of rows) {
      if (r.kind === "tab" && r.windowId === row.windowId) {
        out.push(r.tabId)
      }
    }
    return out.sort((a, b) => a - b)
  }
  if (row.kind === "group" && row.groupId !== null) {
    const key = groupRowKey(row.windowId, row.groupId)
    const out: number[] = []
    for (const r of rows) {
      if (r.kind !== "tab") {
        continue
      }
      if (groupRowKey(r.windowId, r.groupId) === key) {
        out.push(r.tabId)
      }
    }
    return out.sort((a, b) => a - b)
  }
  return []
}

export function resolveActionMenuTargetKind(
  markedKind: SelectKind | null,
  row: TabPickerRow | undefined
): SelectKind | null {
  if (markedKind) {
    return markedKind
  }
  if (!row) {
    return null
  }
  if (row.kind === "tab" || row.kind === "window" || row.kind === "group") {
    return row.kind
  }
  return null
}

export function resolveActionMenuTabLabels(
  rows: TabPickerRow[],
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[],
  row: TabPickerRow | undefined
): string[] {
  const tabIds =
    markedKind !== null
      ? tabIdsForMarked(rows, markedKind, markedTabIds, markedWindowIds, markedGroupKeys)
      : row
        ? tabIdsForRow(rows, row)
        : []
  return tabIds.map((id) => tabTitleById(rows, id))
}

export function buildActionMenuPanel(
  targetKind: SelectKind,
  tabLabels: string[]
): ActionMenuPanel {
  return {
    pickIndex: 0,
    targetKind,
    tabLabels
  }
}

export function actionMenuItemCount(targetKind: SelectKind): number {
  return actionMenuItemsForKind(targetKind).length
}
