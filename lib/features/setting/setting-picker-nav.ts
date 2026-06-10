import type { SettingListPickerView } from "./setting-list-picker-state"
import type { SettingPickerRowId } from "./setting-picker-rows"

/** EN: Main-list row → detail / action view (null = immediate action on Right). */
export function settingMainRowTargetView(rowId: SettingPickerRowId): SettingListPickerView | null {
  switch (rowId) {
    case "language":
      return "language"
    case "fg":
      return "fg"
    case "bg-color":
      return "bgColor"
    case "size":
      return "fontSize"
    case "font":
      return "font"
    case "bg-image":
      return "bgImage"
    case "reset-default":
      return "resetConfirm"
    case "export":
    case "import":
      return null
    default:
      return null
  }
}

export function isSettingListSubView(view: SettingListPickerView): boolean {
  return view === "language" || view === "fontSize" || view === "bgImage" || view === "resetConfirm"
}

export function isSettingDetailView(view: SettingListPickerView): boolean {
  return view === "fg" || view === "bgColor" || view === "font"
}

export function isArrowRight(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey
}

export function isArrowLeft(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.altKey
}
