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

/** `:` コマンドモードの Tab 補完候補（`use-tab-picker-keyboard` と一致させること） */
export const TAB_PICKER_COMMAND_COMPLETIONS = [
  "move",
  "close",
  "group",
  "newwindow",
  "newtab",
  "nohlsearch"
] as const

/** `commandBuffer` の先頭一致で候補を絞る（大文字小文字無視）。 */
export function filterTabPickerCommandCompletions(commandBuffer: string): string[] {
  const p = commandBuffer.toLowerCase()
  return TAB_PICKER_COMMAND_COMPLETIONS.filter((c) => c.startsWith(p))
}

export const TAB_PICKER_COMMANDS_FOR_TAB = [
  "move",
  "close",
  "group",
  "newwindow",
  "nohlsearch"
] as const

export const TAB_PICKER_COMMANDS_FOR_WINDOW = ["close", "newtab", "nohlsearch"] as const

export const TAB_PICKER_COMMANDS_FOR_GROUP = [
  "move",
  "close",
  "newwindow",
  "nohlsearch"
] as const
