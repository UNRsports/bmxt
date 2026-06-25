import type { SettingListPickerView } from "./setting-list-picker-state"
import type { SettingPickerRowId } from "./setting-picker-rows"

/** EN: Main-list row → detail / action view (null = immediate action on Right). */
export function settingMainRowTargetView(rowId: SettingPickerRowId): SettingListPickerView | null {
  switch (rowId) {
    case "language":
      return "language"
    case "edit-picker":
      return "editPicker"
    case "storage":
      return "storageMode"
    case "fg":
      return "fg"
    case "fg-picker":
      return "fgPicker"
    case "bg-color":
      return "bgColor"
    case "search-hit-highlight":
      return "searchHitHighlight"
    case "search-jump-highlight":
      return "searchJumpHighlight"
    case "bg-color-picker":
      return "bgColorPicker"
    case "size":
      return "fontSize"
    case "size-picker":
      return "pickerFontSize"
    case "font":
      return "font"
    case "font-picker":
      return "fontPicker"
    case "bg-image":
      return "bgImage"
    case "bg-image-picker":
      return "pickerBgImage"
    case "reset-default":
      return "resetConfirm"
    case "reset-search-cache":
      return "searchCacheResetConfirm"
    case "storage-pick-dir":
    case "storage-reload":
    case "export":
    case "import":
    case "save":
    case "cancel":
      return null
    default:
      return null
  }
}

export function isSettingListSubView(view: SettingListPickerView): boolean {
  return (
    view === "language" ||
    view === "editPicker" ||
    view === "storageMode" ||
    view === "fontSize" ||
    view === "pickerFontSize" ||
    view === "bgImage" ||
    view === "pickerBgImage" ||
    view === "resetConfirm" ||
    view === "searchCacheResetConfirm"
  )
}

export function isSettingGlobalDetailView(view: SettingListPickerView): boolean {
  return (
    view === "fg" ||
    view === "bgColor" ||
    view === "searchHitHighlight" ||
    view === "searchJumpHighlight" ||
    view === "font"
  )
}

export function isSettingPickerDetailView(view: SettingListPickerView): boolean {
  return view === "fgPicker" || view === "bgColorPicker" || view === "fontPicker"
}

export function isSettingDetailView(view: SettingListPickerView): boolean {
  return isSettingGlobalDetailView(view) || isSettingPickerDetailView(view)
}

export function isArrowRight(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey
}

export function isArrowLeft(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.altKey
}
