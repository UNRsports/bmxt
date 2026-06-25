import { groupRowKey } from "./tab-picker-keyboard"
import { actionMenuItemsForKind } from "./tab-picker-overlay-constants"
import type { ActionMenuPanel, ActionMenuTabTarget, SelectKind } from "./tab-picker-overlay-types"
import type { TabPickerRow } from "./picker-rows"

function tabTargetById(rows: TabPickerRow[], tabId: number): ActionMenuTabTarget {
  for (const row of rows) {
    if (row.kind === "tab" && row.tabId === tabId) {
      return {
        tabId: row.tabId,
        title: row.title,
        url: row.url,
        faviconSrc: row.faviconSrc
      }
    }
  }
  return { tabId, title: `#${tabId}`, url: "", faviconSrc: null }
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

export function resolveActionMenuTabTargets(
  rows: TabPickerRow[],
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[],
  row: TabPickerRow | undefined
): ActionMenuTabTarget[] {
  const tabIds =
    markedKind !== null
      ? tabIdsForMarked(rows, markedKind, markedTabIds, markedWindowIds, markedGroupKeys)
      : row
        ? tabIdsForRow(rows, row)
        : []
  return tabIds.map((id) => tabTargetById(rows, id))
}

export function buildActionMenuPanel(
  targetKind: SelectKind,
  tabTargets: ActionMenuTabTarget[]
): ActionMenuPanel {
  return {
    pickIndex: 0,
    targetKind,
    tabTargets
  }
}

export function actionMenuItemCount(targetKind: SelectKind): number {
  return actionMenuItemsForKind(targetKind).length
}
