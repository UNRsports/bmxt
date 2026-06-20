import type { BulkSubMode, SelectKind } from "./tab-picker-overlay-types"

export type TabPickerActionId =
  | "move"
  | "close"
  | "group"
  | "newWindow"
  | "newTab"
  | "edit"
  | "reload"
  | "duplicate"
  | "nohlsearch"

export type TabPickerListView = "list" | "actions"

export type ListTabPickerActionsContext = {
  /** When `#` marks exist, drives which bulk actions are available. */
  markedKind: SelectKind | null
  /** Highlighted row kind when no marks. */
  rowKind: "tab" | "window" | "group" | null
  hlSearchPattern: string
}

const TAB_ACTIONS: readonly TabPickerActionId[] = [
  "move",
  "close",
  "group",
  "newWindow",
  "reload",
  "duplicate"
]

const WINDOW_ACTIONS: readonly TabPickerActionId[] = ["close", "newTab", "edit"]

const GROUP_ACTIONS: readonly TabPickerActionId[] = ["move", "close", "newWindow", "edit"]

/** EN: Resolve effective selection kind for the action menu (marks override highlighted row). */
export function resolveTabPickerActionTargetKind(
  markedKind: SelectKind | null,
  rowKind: "tab" | "window" | "group" | null
): SelectKind | null {
  if (markedKind !== null) {
    return markedKind
  }
  return rowKind
}

/** EN: List actions for the current picker context (→ submenu). */
export function listTabPickerActions(ctx: ListTabPickerActionsContext): TabPickerActionId[] {
  const targetKind = resolveTabPickerActionTargetKind(ctx.markedKind, ctx.rowKind)
  const base =
    targetKind === "window"
      ? [...WINDOW_ACTIONS]
      : targetKind === "group"
        ? [...GROUP_ACTIONS]
        : targetKind === "tab"
          ? [...TAB_ACTIONS]
          : []

  if (ctx.hlSearchPattern.trim() !== "") {
    base.push("nohlsearch")
  }
  return base
}

export function tabPickerActionToBulkSubMode(id: TabPickerActionId): BulkSubMode | null {
  switch (id) {
    case "move":
      return "move"
    case "close":
      return "close"
    case "group":
      return "group"
    case "newWindow":
      return "newWindow"
    case "newTab":
      return "newTab"
    case "edit":
      return "edit"
    default:
      return null
  }
}

export function tabPickerActionIsImmediate(id: TabPickerActionId): boolean {
  return id === "reload" || id === "duplicate" || id === "nohlsearch"
}

/**
 * EN: Tab targets for reload/duplicate (→ action menu).
 * Single tab: highlighted row wins (`#` optional). Multiple tabs: `#`-marked tab ids only (2+).
 */
export function resolveTabActionTargetTabIds(input: {
  markedKind: SelectKind | null
  markedTabIds: number[]
  highlightedTabId: number | null
  selectedTabIds: number[]
}): number[] {
  if (input.markedKind === "tab") {
    if (input.markedTabIds.length >= 2) {
      return [...input.markedTabIds]
    }
    if (input.highlightedTabId !== null) {
      return [input.highlightedTabId]
    }
    if (input.markedTabIds.length === 1) {
      return [input.markedTabIds[0]!]
    }
    return []
  }
  if (input.selectedTabIds.length > 0) {
    return [...input.selectedTabIds]
  }
  if (input.highlightedTabId !== null) {
    return [input.highlightedTabId]
  }
  return []
}

export const TAB_PICKER_ACTION_MESSAGE_KEYS: Record<
  TabPickerActionId,
  "tabs.picker.action.move" | "tabs.picker.action.close" | "tabs.picker.action.group" | "tabs.picker.action.newWindow" | "tabs.picker.action.newTab" | "tabs.picker.action.edit" | "tabs.picker.action.reload" | "tabs.picker.action.duplicate" | "tabs.picker.action.nohlsearch"
> = {
  move: "tabs.picker.action.move",
  close: "tabs.picker.action.close",
  group: "tabs.picker.action.group",
  newWindow: "tabs.picker.action.newWindow",
  newTab: "tabs.picker.action.newTab",
  edit: "tabs.picker.action.edit",
  reload: "tabs.picker.action.reload",
  duplicate: "tabs.picker.action.duplicate",
  nohlsearch: "tabs.picker.action.nohlsearch"
}
