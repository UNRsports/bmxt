import { actionMenuItemsForKind, NEW_GROUP_COLORS } from "./tab-picker-overlay-constants.ts"
import type { NewGroupPaletteColor } from "./tab-picker-overlay-constants.ts"
import type { ActionMenuPanel, ActionMenuTabTarget, SelectKind } from "./tab-picker-overlay-types.ts"
import type { TabPickerRow } from "./picker-rows.ts"
import { computeSelectedTabIdsFromMarks } from "./picker-selected-tab-ids.ts"

/** EN: Same format as `groupRowKey` in tab-picker-keyboard (kept local for node:test). */
function groupRowKey(windowId: number, groupId: number | null): string {
  return `${windowId}:${groupId === null ? "none" : String(groupId)}`
}

function groupTitleForTab(
  rows: TabPickerRow[],
  windowId: number,
  groupId: number | null
): string | null {
  if (groupId === null || groupId < 0) {
    return null
  }
  for (const row of rows) {
    if (row.kind === "group" && row.windowId === windowId && row.groupId === groupId) {
      const label = row.label.trim()
      if (label.length > 0) {
        return label
      }
      const title = row.title.trim()
      return title.length > 0 ? title : null
    }
  }
  return null
}

function tabTargetById(rows: TabPickerRow[], tabId: number): ActionMenuTabTarget {
  for (const row of rows) {
    if (row.kind === "tab" && row.tabId === tabId) {
      return {
        tabId: row.tabId,
        title: row.title,
        url: row.url,
        faviconSrc: row.faviconSrc,
        groupColor: row.groupColor,
        groupTitle: groupTitleForTab(rows, row.windowId, row.groupId)
      }
    }
  }
  return {
    tabId,
    title: `#${tabId}`,
    url: "",
    faviconSrc: null,
    groupColor: null,
    groupTitle: null
  }
}

/** EN: Divider accent — tab group color when set, else palette cycle for ungrouped rows. */
export function actionMenuTargetDividerColor(
  groupColor: NewGroupPaletteColor | null,
  index: number
): NewGroupPaletteColor {
  if (groupColor !== null) {
    return groupColor
  }
  return NEW_GROUP_COLORS[index % NEW_GROUP_COLORS.length]
}

function tabIdsForRow(rows: TabPickerRow[], row: TabPickerRow): number[] {
  if (row.kind === "tab") {
    return [row.tabId]
  }
  if (row.kind === "window") {
    return computeSelectedTabIdsFromMarks(rows, "window", [], [row.windowId], [])
  }
  if (row.kind === "group" && row.groupId !== null) {
    return computeSelectedTabIdsFromMarks(
      rows,
      "group",
      [],
      [],
      [groupRowKey(row.windowId, row.groupId)]
    )
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
      ? computeSelectedTabIdsFromMarks(
          rows,
          markedKind,
          markedTabIds,
          markedWindowIds,
          markedGroupKeys
        )
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
