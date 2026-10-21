/** Chrome `tabGroups.update` color enum order（API と同じ集合） */
export const NEW_GROUP_COLORS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange"
] as const

export type NewGroupPaletteColor = (typeof NEW_GROUP_COLORS)[number]

/** Chrome `tabGroups` の `color` をピッカー用パレットに正規化する。 */
export function normalizeTabGroupColor(
  color: string | undefined
): NewGroupPaletteColor {
  if (color !== undefined && (NEW_GROUP_COLORS as readonly string[]).includes(color)) {
    return color as NewGroupPaletteColor
  }
  return "grey"
}

export const COLOR_SWATCH_BG: Partial<Record<NewGroupPaletteColor, string>> = {
  grey: "#9aa0a6",
  blue: "#8ab4f8",
  red: "#f28b82",
  yellow: "#fdd663",
  green: "#81c995",
  pink: "#ff8bcb",
  purple: "#d7aefb",
  cyan: "#78d9ec",
  orange: "#fcad70"
}

/** 既存グループ一覧の「新規グループ」行（Chrome のグループ ID とは別物） */
export const NEW_GROUP_LIST_SENTINEL = -1

import type { ActionMenuItemId, GroupEditMenuActionId, SelectKind } from "./tab-picker-overlay-types"

/** `:` コマンドモードの Tab 補完候補（レガシー; tabs ピッカーでは → メニューに移行） */
export const TAB_PICKER_COMMAND_COMPLETIONS = [
  "move",
  "close",
  "group",
  "newwindow",
  "newtab",
  "edit",
  "nohlsearch"
] as const

/** `commandBuffer` の先頭一致で候補を絞る（大文字小文字無視）。 */
export function filterTabPickerCommandCompletions(commandBuffer: string): string[] {
  const p = commandBuffer.toLowerCase()
  return TAB_PICKER_COMMAND_COMPLETIONS.filter((c) => c.startsWith(p))
}

export const ACTION_MENU_ITEMS_FOR_TAB = [
  { id: "move" as const, messageKey: "tabs.picker.actionMenu.move" as const },
  { id: "close" as const, messageKey: "tabs.picker.actionMenu.close" as const },
  { id: "group" as const, messageKey: "tabs.picker.actionMenu.group" as const },
  { id: "newWindow" as const, messageKey: "tabs.picker.actionMenu.newWindow" as const },
  { id: "reload" as const, messageKey: "tabs.picker.actionMenu.reload" as const },
  { id: "snapshot" as const, messageKey: "tabs.picker.actionMenu.snapshot" as const }
] as const

export const ACTION_MENU_ITEMS_FOR_WINDOW = [
  { id: "close" as const, messageKey: "tabs.picker.actionMenu.close" as const },
  { id: "newTab" as const, messageKey: "tabs.picker.actionMenu.newTab" as const },
  { id: "edit" as const, messageKey: "tabs.picker.actionMenu.edit" as const },
  { id: "reload" as const, messageKey: "tabs.picker.actionMenu.reload" as const },
  { id: "snapshot" as const, messageKey: "tabs.picker.actionMenu.snapshot" as const }
] as const

export const ACTION_MENU_ITEMS_FOR_GROUP = [
  { id: "move" as const, messageKey: "tabs.picker.actionMenu.move" as const },
  { id: "close" as const, messageKey: "tabs.picker.actionMenu.close" as const },
  { id: "newWindow" as const, messageKey: "tabs.picker.actionMenu.newWindow" as const },
  { id: "edit" as const, messageKey: "tabs.picker.actionMenu.edit" as const },
  { id: "reload" as const, messageKey: "tabs.picker.actionMenu.reload" as const },
  { id: "snapshot" as const, messageKey: "tabs.picker.actionMenu.snapshot" as const }
] as const

export type ActionMenuItemDef = {
  id: ActionMenuItemId
  messageKey:
    | "tabs.picker.actionMenu.move"
    | "tabs.picker.actionMenu.close"
    | "tabs.picker.actionMenu.group"
    | "tabs.picker.actionMenu.newWindow"
    | "tabs.picker.actionMenu.newTab"
    | "tabs.picker.actionMenu.edit"
    | "tabs.picker.actionMenu.reload"
    | "tabs.picker.actionMenu.snapshot"
}

export function actionMenuItemsForKind(kind: SelectKind): readonly ActionMenuItemDef[] {
  switch (kind) {
    case "tab":
      return ACTION_MENU_ITEMS_FOR_TAB
    case "window":
      return ACTION_MENU_ITEMS_FOR_WINDOW
    case "group":
      return ACTION_MENU_ITEMS_FOR_GROUP
  }
}

export function actionMenuItemAtPickIndex(
  kind: SelectKind,
  pickIndex: number
): ActionMenuItemId | null {
  const item = actionMenuItemsForKind(kind)[pickIndex]
  return item?.id ?? null
}

export const TAB_PICKER_COMMANDS_FOR_TAB = [
  "move",
  "close",
  "group",
  "newwindow",
  "nohlsearch"
] as const

export const TAB_PICKER_COMMANDS_FOR_WINDOW = ["close", "newtab", "edit", "nohlsearch"] as const

export const TAB_PICKER_COMMANDS_FOR_GROUP = [
  "move",
  "close",
  "newwindow",
  "edit",
  "nohlsearch"
] as const

export const GROUP_EDIT_MENU_ITEMS = [
  { id: "rename" as const, messageKey: "tabs.picker.editMenu.rename" as const },
  { id: "ungroup" as const, messageKey: "tabs.picker.editMenu.ungroup" as const },
  { id: "deleteGroup" as const, messageKey: "tabs.picker.editMenu.deleteGroup" as const }
] as const

export type GroupEditMenuItemDef = {
  id: GroupEditMenuActionId
  messageKey:
    | "tabs.picker.editMenu.rename"
    | "tabs.picker.editMenu.ungroup"
    | "tabs.picker.editMenu.deleteGroup"
}

export function groupEditMenuItems(): readonly GroupEditMenuItemDef[] {
  return GROUP_EDIT_MENU_ITEMS
}
