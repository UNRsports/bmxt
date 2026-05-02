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
