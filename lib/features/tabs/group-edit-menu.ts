import { GROUP_EDIT_MENU_ITEMS } from "./tab-picker-overlay-constants"
import type { GroupEditMenuActionId } from "./tab-picker-overlay-types"

export function groupEditMenuActionAtPickIndex(pickIndex: number): GroupEditMenuActionId | null {
  const item = GROUP_EDIT_MENU_ITEMS[pickIndex]
  return item?.id ?? null
}
